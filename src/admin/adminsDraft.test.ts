import {
  ADMIN_ROLES,
  adminLabel,
  adminProblems,
  adminRow,
  changedRow,
  emptyAdminDraft,
  isListed,
  normalisedEmail,
  ROLE_NAMES,
  ROLE_POWERS,
  sortedAdmins,
  type AdminDraft,
  type AdminRecord,
} from './adminsDraft'

const record = (overrides: Partial<AdminRecord> = {}): AdminRecord => ({
  email: 'alguien@example.com',
  role: 'sporting_management',
  displayName: null,
  active: true,
  ...overrides,
})

const draft = (overrides: Partial<AdminDraft> = {}): AdminDraft => ({
  ...emptyAdminDraft(),
  email: 'nadie@example.com',
  ...overrides,
})

describe('the three roles', () => {
  it('names exactly the three the database allows, and no fourth', () => {
    expect([...ADMIN_ROLES].sort()).toEqual([
      'communications',
      'general_administrator',
      'sporting_management',
    ])
    expect(Object.keys(ROLE_NAMES)).toHaveLength(3)
    expect(Object.keys(ROLE_POWERS)).toHaveLength(3)
  })

  it('says what each one may do, as the functional document tabulates it', () => {
    expect(ROLE_POWERS).toEqual({
      general_administrator: 'Acceso total.',
      sporting_management: 'Equipos, fixture, resultados y estadísticas.',
      communications: 'Noticias, fotos y sponsors.',
    })
  })

  it('offers the narrowest role first, so full access is never the easy default', () => {
    expect(ADMIN_ROLES[0]).toBe('communications')
    expect(ADMIN_ROLES[ADMIN_ROLES.length - 1]).toBe('general_administrator')
    expect(emptyAdminDraft().role).toBe('communications')
  })
})

describe('the address', () => {
  it('folds to lower case, because the table checks that it already is', () => {
    expect(normalisedEmail('  Nombre.Apellido@Gmail.COM ')).toBe(
      'nombre.apellido@gmail.com',
    )
  })

  it('writes the folded address, so the CHECK cannot refuse the row', () => {
    const row = adminRow(draft({ email: ' Mixed.Case@Gmail.com ' }))

    expect(row.email).toBe('mixed.case@gmail.com')
    expect(row.email).toBe(row.email.toLowerCase())
  })

  it('gives a new administrator access, which is the whole point of adding them', () => {
    expect(adminRow(draft()).active).toBe(true)
  })

  it('leaves a name nobody wrote down absent instead of empty', () => {
    expect(adminRow(draft({ displayName: '   ' })).display_name).toBeNull()
    expect(adminRow(draft({ displayName: ' Ana ' })).display_name).toBe('Ana')
  })
})

describe('what the form refuses', () => {
  it('asks for an address before anything else', () => {
    expect(adminProblems(draft({ email: '  ' }), [])).toEqual([
      {
        kind: 'email-missing',
        message:
          'Escribí la dirección de Google con la que ingresa la persona.',
      },
    ])
  })

  it('refuses something that is not an address', () => {
    for (const text of ['nadie', '@gmail.com', 'alguien@']) {
      expect(
        adminProblems(draft({ email: text }), []).map((p) => p.kind),
      ).toEqual(['email-shape'])
    }
  })

  it('refuses an address already in the list, whatever case it was typed in', () => {
    const problems = adminProblems(draft({ email: 'Alguien@Example.com' }), [
      record(),
    ])

    expect(problems.map((problem) => problem.kind)).toEqual(['email-listed'])
    // The primary key would refuse it too; catching it here says what to do
    // instead of showing a constraint name.
    expect(problems.map((problem) => problem.message).join('')).toContain(
      'Cambiale el rol en su fila',
    )
  })

  it('refuses an address whose access was withdrawn, because the row is still there', () => {
    expect(
      adminProblems(draft({ email: 'alguien@example.com' }), [
        record({ active: false }),
      ]).map((problem) => problem.kind),
    ).toEqual(['email-listed'])
  })

  it('never repeats the address back, because it is personal data', () => {
    const spelling = JSON.stringify([
      adminProblems(draft({ email: 'nadie' }), []),
      adminProblems(draft({ email: 'alguien@example.com' }), [record()]),
    ])

    expect(spelling).not.toContain('alguien')
    expect(spelling).not.toContain('example.com')
  })

  it('accepts an address nobody has yet', () => {
    expect(
      adminProblems(draft({ email: 'otra@example.com' }), [record()]),
    ).toEqual([])
  })
})

describe('changing a row', () => {
  it('moves the role and leaves everything else where it was', () => {
    const row = changedRow(record({ displayName: 'Ana' }), {
      role: 'communications',
    })

    expect(row).toEqual({
      email: 'alguien@example.com',
      role: 'communications',
      display_name: 'Ana',
      active: true,
    })
  })

  it('withdraws access by clearing the flag, and keeps the row', () => {
    const row = changedRow(record(), { active: false })

    expect(row.active).toBe(false)
    expect(row.email).toBe('alguien@example.com')
    expect(row.role).toBe('sporting_management')
  })

  it('gives access back the same way', () => {
    expect(changedRow(record({ active: false }), { active: true }).active).toBe(
      true,
    )
  })
})

describe('who is reading the list', () => {
  it('finds the reader in it whatever case they signed in with', () => {
    expect(isListed([record()], 'Alguien@Example.com')).toBe(true)
  })

  it('says the reader is absent from an empty list, which is the founding owner', () => {
    expect(isListed([], 'ushuaiabl@example.com')).toBe(false)
  })

  it('says the reader is absent from a list that does not hold them', () => {
    expect(isListed([record()], 'otra@example.com')).toBe(false)
  })
})

describe('how the list reads', () => {
  it('names somebody by their name when the league wrote one down', () => {
    expect(adminLabel(record({ displayName: 'Ana Pérez' }))).toBe('Ana Pérez')
    expect(adminLabel(record())).toBe('alguien@example.com')
  })

  it('sorts by the name it reads by, in Spanish', () => {
    const sorted = sortedAdmins([
      record({ email: 'c@example.com', displayName: 'Zulema' }),
      record({ email: 'a@example.com', displayName: 'Ángel' }),
      record({ email: 'b@example.com', displayName: 'Ana' }),
    ])

    expect(sorted.map(adminLabel)).toEqual(['Ana', 'Ángel', 'Zulema'])
  })

  it('leaves the list it was handed alone', () => {
    const list = [record({ email: 'b@example.com' }), record()]
    sortedAdmins(list)

    expect(list.map((each) => each.email)).toEqual([
      'b@example.com',
      'alguien@example.com',
    ])
  })
})
