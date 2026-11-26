"""Prepare a private, repeatable 2026 statement import from the two league CSVs."""

import argparse
import csv
import os
from decimal import Decimal
from pathlib import Path
import re
import unicodedata


def name_key(value):
    plain = ''.join(
        char for char in unicodedata.normalize('NFD', value.casefold())
        if not unicodedata.combining(char)
    )
    return tuple(sorted(re.findall(r'[^\W_]+', plain)))


def cents(value, balance=False):
    value = value.strip()
    if not value:
        return None
    if balance and value in {'-', '–', '—'}:
        return 0
    if not re.fullmatch(r'(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{1,2})?', value):
        raise ValueError('Unsupported amount format')
    amount = int(Decimal(value.replace(',', '')) * 100)
    if amount > 2_147_483_647 or (not balance and amount == 0):
        raise ValueError('Amount is outside the supported range')
    return amount


def roster(path):
    sql = path.read_text(encoding='utf-8')
    rows = sql.split('insert into public.players (id, full_name)\nvalues', 1)[1].split(
        'on conflict (id)', 1
    )[0]
    entries = {}
    for player_id, printed_name in re.findall(r"\('([0-9a-f-]{36})', '((?:[^']|'')*)'\)", rows):
        name = printed_name.replace("''", "'")
        entries.setdefault(name_key(name), []).append((player_id, name))
    if not entries:
        raise ValueError('No player records found in seed')
    return entries


def read_export(path, competition, players):
    payment_columns = ('Pago 1', 'Pago 2', 'Pago 3') if competition == 'beer' else ('Pagos', 'Pago 2')
    balance_column = 'falta' if competition == 'beer' else 'Falta'
    with path.open(encoding='utf-8-sig', newline='') as source:
        reader = csv.DictReader(source, strict=True)
        required = {'Apellido', 'Nombre', balance_column, *payment_columns}
        if not required.issubset(reader.fieldnames or []):
            raise ValueError(f'Missing columns in {competition} export')
        for row_number, row in enumerate(reader, start=2):
            if None in row or any(row[column] is None for column in required):
                raise ValueError(f'Malformed {competition} export row {row_number}')
            if not any(row.values()):
                continue
            try:
                name = ' '.join((row['Apellido'] + ' ' + row['Nombre']).split())
                key = name_key(name)
                if not key:
                    raise ValueError('Missing player name')
                matches = players.get(key, [])
                payments = [amount for column in payment_columns if (amount := cents(row[column])) is not None]
                balance = cents(row[balance_column], balance=True)
            except ValueError as error:
                raise ValueError(f'{competition} export row {row_number}: {error}') from None
            yield competition, row_number, name, payments, balance, matches[0] if len(matches) == 1 else None


def quote(value):
    return "'" + value.replace("'", "''") + "'"


def write_import(output, rows):
    matched = [(competition, candidate[0]) for competition, _, _, _, _, candidate in rows if candidate]
    if len(set(matched)) != len(matched):
        raise ValueError('Multiple source rows match the same player within a competition')
    values = []
    for competition, source_row, name, payments, balance, candidate in rows:
        player_id, player_name = candidate or (None, None)
        amounts = 'array[' + ','.join(map(str, payments)) + ']::integer[]'
        values.append(
            f"  ({quote(competition)}, {source_row}, {quote(name)}, {amounts}, "
            f"{'null' if balance is None else balance}, "
            f"{quote(player_id) if player_id else 'null'}::uuid, "
            f"{quote(player_name) if player_name else 'null'})"
        )
    if not values:
        raise ValueError('The exports contain no statements')
    output.write("begin;\nset local standard_conforming_strings = on;\n")
    output.write(
        "create temp table membership_import (competition_key, source_row, source_name, payments_cents, balance_cents, player_id, player_name) on commit drop as values\n"
        + ",\n".join(values)
        + ";\n"
        "do $$ begin\n"
        "  if exists (select 1 from membership_import i join public.membership_statements m\n"
        "    on m.season_year = 2026 and m.competition_key = i.competition_key and m.source_row = i.source_row\n"
        "    where (m.source_name, m.payments_cents, m.balance_cents) is distinct from\n"
        "      (i.source_name, i.payments_cents, i.balance_cents)) then\n"
        "    raise exception 'Existing statement does not match this export row';\n"
        "  end if;\n"
        "end $$;\n"
        "insert into public.membership_statements\n"
        "  (season_year, competition_key, source_row, source_name, payments_cents, balance_cents, player_id)\n"
        "select 2026, s.competition_key, s.source_row, s.source_name, s.payments_cents, s.balance_cents, p.id\n"
        "from membership_import s left join public.players p on p.id = s.player_id and p.full_name = s.player_name\n"
        "on conflict (season_year, competition_key, source_row) do nothing;\ncommit;\n"
    )


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--beer', type=Path, required=True)
    parser.add_argument('--wubl', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    options = parser.parse_args()
    seed = Path(__file__).resolve().parents[1] / 'supabase/seed/season-2026.sql'
    players = roster(seed)
    rows = [*read_export(options.beer, 'beer', players), *read_export(options.wubl, 'wubl', players)]
    descriptor = os.open(options.output, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(descriptor, 'w', encoding='utf-8') as output:
        write_import(output, rows)
    print(f"{len(rows)} rows; {sum(row[-1] is not None for row in rows)} exact roster matches.")


if __name__ == '__main__':
    main()
