import { useEffect, useState } from 'react'

import {
  loadContactChannelsAdmin,
  saveContactChannel,
  type ContactChannelRow,
} from './adminQueries'
import './TextsScreen.css'

/**
 * Contacto: the channels the public site shows, editable at last.
 *
 * The operators asked twice for exactly this (mail and Instagram, 7 August
 * 2026). Who may save is the database's decision: the policies accept
 * communications and general administration, the same pair as photos and
 * sponsors, and the href constraint refuses anything that is not `https://` or
 * `mailto:` — so a `javascript:` link cannot be stored no matter what this
 * screen does.
 *
 * A channel is retired, never deleted (`active = false`), the same rule as
 * sponsors: what the league once published is a fact.
 *
 * It borrows the Textos stylesheet on purpose: same panel, same vocabulary,
 * and a second stylesheet saying the same things would only drift.
 */
const EMPTY: Omit<ContactChannelRow, 'id'> = {
  label: '',
  href: '',
  glyph: null,
  display_order: 0,
  active: true,
}

export function ContactScreen() {
  const [rows, setRows] = useState<ContactChannelRow[] | null>(null)
  const [because, setBecause] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    let current = true
    void loadContactChannelsAdmin().then((result) => {
      if (!current) return
      if (result.ok) setRows(result.data)
      else setBecause(result.because)
    })
    return () => {
      current = false
    }
  }, [])

  if (because !== null) {
    return (
      <p className="admin__error" role="alert">
        No pudimos leer los canales: {because}
      </p>
    )
  }

  if (rows === null) {
    return (
      <p className="admin__waiting" aria-live="polite">
        Cargando el contacto…
      </p>
    )
  }

  const change = (id: string, patch: Partial<ContactChannelRow>) => {
    setRows((all) =>
      (all ?? []).map((row) => (row.id === id ? { ...row, ...patch } : row)),
    )
  }

  const add = () => {
    setRows((all) => [
      ...(all ?? []),
      {
        ...EMPTY,
        id: crypto.randomUUID(),
        display_order: (all?.length ?? 0) + 1,
      },
    ])
  }

  const save = async (row: ContactChannelRow) => {
    if (row.label.trim() === '' || row.href.trim() === '') {
      setNotice('Un canal necesita nombre y dirección.')
      return
    }
    const result = await saveContactChannel({
      ...row,
      label: row.label.trim(),
      href: row.href.trim(),
      glyph: row.glyph?.trim() === '' ? null : row.glyph,
    })
    setNotice(
      result.ok
        ? `Guardado: ${row.label}.`
        : `No se pudo guardar: ${result.because}`,
    )
  }

  return (
    <section className="texts">
      <h2 className="texts__title">Contacto</h2>

      <p className="texts__note">
        Los canales que muestra la página de contacto: correo, Instagram, lo que
        la liga quiera publicar. La dirección tiene que empezar con{' '}
        <code>https://</code> o <code>mailto:</code> — la base rechaza cualquier
        otra cosa. Un canal desactivado deja de mostrarse pero no se borra.
      </p>

      {notice !== null && (
        <p className="texts__notice" role="status">
          {notice}
        </p>
      )}

      <ul className="texts__blocks">
        {rows.map((row) => (
          <li className="texts__block" key={row.id}>
            <label className="texts__label" htmlFor={`label-${row.id}`}>
              Nombre (lo que se lee: «Instagram», «Correo»)
            </label>
            <input
              id={`label-${row.id}`}
              className="texts__input"
              value={row.label}
              onChange={(event) =>
                change(row.id, { label: event.target.value })
              }
            />
            <label className="texts__label" htmlFor={`href-${row.id}`}>
              Dirección (https://… o mailto:…)
            </label>
            <input
              id={`href-${row.id}`}
              className="texts__input"
              inputMode="url"
              placeholder="mailto:ushuaiabl@gmail.com"
              value={row.href}
              onChange={(event) => change(row.id, { href: event.target.value })}
            />
            <label className="texts__label" htmlFor={`glyph-${row.id}`}>
              Emoji (opcional)
            </label>
            <input
              id={`glyph-${row.id}`}
              className="texts__input"
              value={row.glyph ?? ''}
              onChange={(event) =>
                change(row.id, { glyph: event.target.value })
              }
            />
            <label className="texts__label">
              <input
                type="checkbox"
                checked={row.active}
                onChange={(event) =>
                  change(row.id, { active: event.target.checked })
                }
              />{' '}
              Publicado
            </label>
            <button
              className="texts__save"
              type="button"
              onClick={() => void save(row)}
            >
              Guardar
            </button>
          </li>
        ))}
      </ul>

      <button className="texts__save" type="button" onClick={add}>
        Agregar canal
      </button>
    </section>
  )
}
