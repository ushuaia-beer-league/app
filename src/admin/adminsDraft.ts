/**
 * The administrator list as a draft, and the rows that draft becomes.
 *
 * Pure, so the rules the database carries can be read and tested without a
 * database: `AdminsScreen` renders this vocabulary and `adminQueries.ts` issues
 * the rows. Nothing here grants anybody anything. Only the general
 * administrator may write `admins`, `admins_insert_league_admin` and
 * `admins_update_league_admin` are what enforce it, and this module's job is to
 * keep the panel from offering a state those policies or the table's CHECK
 * constraints would refuse.
 *
 * Three of the table's decisions run through everything below.
 *
 * The address is the primary key and `admins_email_lowercase` checks that it
 * equals `lower(email)`, so an address is folded before it is written or the row
 * is refused outright. `admins_email_shape` wants an arroba with something
 * before it.
 *
 * Access is withdrawn by clearing `active`, never by deleting the row, because
 * the history of who could write has to survive. There is no delete anywhere in
 * this module and none on the screen.
 *
 * The founding owner deliberately has no row: `private.admin_role()` answers for
 * that address from a constant, which is what lets an empty table still admit
 * the first administrator and keeps the league from locking itself out. So the
 * list can legitimately be empty while somebody is reading it, and the person
 * reading it may not be in it.
 */

import type { AdminRole } from './useAdminSession'

/** One row of `admins`, keyed by the address it signs in with. */
export interface AdminRecord {
  /** Lower case, always: the table refuses anything else. */
  email: string
  role: AdminRole
  /** Null when nobody wrote one down, which is legal and common. */
  displayName: string | null
  /** False once access was withdrawn. The row stays either way. */
  active: boolean
}

/**
 * The three roles, in the order the panel offers them, narrowest access first,
 * so the widest is never the one a distracted hand lands on.
 */
export const ADMIN_ROLES: readonly AdminRole[] = [
  'communications',
  'sporting_management',
  'general_administrator',
]

/**
 * What the panel calls each role. Keyed by the union, so a fourth role cannot be
 * invented here and cannot be added to the union without this stopping to
 * compile. The database agrees: `admins_role_allowed` lists exactly these three.
 */
export const ROLE_NAMES: Record<AdminRole, string> = {
  general_administrator: 'Administración general',
  sporting_management: 'Gestión deportiva',
  communications: 'Comunicación',
}

/**
 * What each role may do, from the role table of the organisation's functional
 * document (knowledge base 7.4). This is the same split the policy helpers
 * enforce: `can_manage_league` for the general administrator,
 * `can_manage_sport` for the sporting management, and the sponsor and photo
 * tables for communications.
 */
export const ROLE_POWERS: Record<AdminRole, string> = {
  general_administrator: 'Acceso total.',
  sporting_management: 'Equipos, fixture, resultados y estadísticas.',
  communications: 'Noticias, fotos y sponsors.',
}

/** What the operator has typed into the form that adds somebody. */
export interface AdminDraft {
  email: string
  displayName: string
  role: AdminRole
}

/**
 * An empty form. The narrowest role is the default on purpose: adding somebody
 * by accident with full access is a worse mistake than adding them with too
 * little and having to widen it.
 */
export function emptyAdminDraft(): AdminDraft {
  return { email: '', displayName: '', role: 'communications' }
}

/**
 * The address as the table holds it: trimmed and folded to lower case.
 *
 * `admins_email_lowercase` is a CHECK rather than a normalisation, so a
 * mixed-case address is not stored differently, it is refused. Folding here is
 * what lets somebody type an address the way they read it off a phone.
 */
export function normalisedEmail(text: string): string {
  return text.trim().toLowerCase()
}

/** How the list names somebody: their name if the league wrote one down. */
export function adminLabel(record: AdminRecord): string {
  return record.displayName ?? record.email
}

export type AdminProblemKind =
  /** Nothing typed yet. */
  | 'email-missing'
  /** Nothing the shape check would accept. */
  | 'email-shape'
  /** Already the primary key of a row, withdrawn or not. */
  | 'email-listed'

export interface AdminProblem {
  kind: AdminProblemKind
  /** What the panel says out loud, in Spanish. */
  message: string
}

/**
 * Every reason this address cannot be added, in the order the form reads.
 *
 * None of these messages repeats the address back. It is personal data, and a
 * sentence that quotes it ends up in a screenshot pasted into a group chat.
 *
 * The duplicate is caught here rather than left to the primary key because the
 * screen has the list already, and because the right answer to "that person is
 * already listed" is to change their row, not to insert a second one. The
 * database still refuses it if two people press the button at once, and
 * `adminQueries.ts` says the same thing about that refusal.
 */
export function adminProblems(
  draft: AdminDraft,
  admins: readonly AdminRecord[],
): AdminProblem[] {
  const email = normalisedEmail(draft.email)

  if (email === '') {
    return [
      {
        kind: 'email-missing',
        message:
          'Escribí la dirección de Google con la que ingresa la persona.',
      },
    ]
  }

  const at = email.indexOf('@')
  if (at < 1 || at === email.length - 1) {
    return [
      {
        kind: 'email-shape',
        message:
          'Eso no parece una dirección de correo: tiene que tener algo antes y algo después de la arroba.',
      },
    ]
  }

  if (admins.some((admin) => admin.email === email)) {
    return [
      {
        kind: 'email-listed',
        message:
          'Esa dirección ya está en la lista. Cambiale el rol en su fila, o devolvele el acceso si se lo retiraron.',
      },
    ]
  }

  return []
}

/**
 * The row `admins` holds, snake case and all, so a write can be read against the
 * migration without a translation step. A type alias rather than an interface
 * because it is passed straight to a query builder that takes an indexable
 * object.
 */
export type AdminRow = {
  email: string
  role: AdminRole
  display_name: string | null
  active: boolean
}

/** The draft as a row. Only meaningful once `adminProblems()` is empty. */
export function adminRow(draft: AdminDraft): AdminRow {
  const displayName = draft.displayName.trim()

  return {
    email: normalisedEmail(draft.email),
    role: draft.role,
    // Nullable on purpose: a name nobody wrote down stays absent rather than
    // becoming an empty string that reads as a person with no name.
    display_name: displayName === '' ? null : displayName,
    active: true,
  }
}

/** An existing row as the table holds it, with one column moved. */
export function changedRow(
  record: AdminRecord,
  change: Partial<Pick<AdminRecord, 'role' | 'active'>>,
): AdminRow {
  return {
    email: record.email,
    role: change.role ?? record.role,
    display_name: record.displayName,
    active: change.active ?? record.active,
  }
}

/**
 * Whether the person reading the list has a row in it.
 *
 * They may not, and that is not the screen being broken. The founding owner is
 * answered by `private.admin_role()` from a hardcoded constant and has no row
 * on purpose, so a general administrator absent from this list is the founding
 * owner: no other role can be held without a row to hold it. The screen says so
 * instead of looking like it lost somebody.
 */
export function isListed(
  admins: readonly AdminRecord[],
  email: string,
): boolean {
  const own = normalisedEmail(email)
  return admins.some((admin) => admin.email === own)
}

/** The list in the order the screen shows it: by the name it reads by. */
export function sortedAdmins(admins: readonly AdminRecord[]): AdminRecord[] {
  return [...admins].sort((a, b) =>
    adminLabel(a).localeCompare(adminLabel(b), 'es'),
  )
}
