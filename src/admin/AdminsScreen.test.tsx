import { fireEvent, render, screen, within } from '@testing-library/react'
import type { Result } from './adminQueries'
import { AdminsScreen } from './AdminsScreen'
import type { AdminRecord, AdminRow } from './adminsDraft'
import type { AdminRole } from './useAdminSession'

/**
 * The panel cannot reach the real database from a test, and must not try. Every
 * read and write is a fake here, which is also the only way a refusal by row
 * level security can be exercised at all: the refusals are the interesting half
 * of this screen.
 */
type Loader = () => Promise<Result<AdminRecord[]>>
type Writer = (row: AdminRow) => Promise<Result<null>>

const record = (overrides: Partial<AdminRecord> = {}): AdminRecord => ({
  email: 'deportiva@example.com',
  role: 'sporting_management',
  displayName: 'Gestión Deportiva',
  active: true,
  ...overrides,
})

const accepting = () =>
  vi.fn<Writer>().mockResolvedValue({ ok: true, data: null })

/** What `admins_insert_league_admin` does to somebody who is not the general
 * administrator: the request is refused, and the panel says so as a permission. */
const refusing = (because: string) =>
  vi.fn<Writer>().mockResolvedValue({ ok: false, because })

interface Options {
  admins?: AdminRecord[]
  load?: Loader
  add?: ReturnType<typeof accepting>
  change?: ReturnType<typeof accepting>
  role?: AdminRole
  email?: string
}

const show = ({
  admins = [],
  load = () => Promise.resolve({ ok: true, data: admins }),
  add = accepting(),
  change = accepting(),
  role = 'general_administrator',
  email = 'lafundadora@example.com',
}: Options = {}) => {
  render(
    <AdminsScreen
      add={add}
      change={change}
      email={email}
      load={load}
      role={role}
    />,
  )
  return { add, change }
}

const rowOf = (who: string) =>
  screen.getByText(who).closest('li') as HTMLElement

const typeAddress = (text: string) =>
  fireEvent.change(screen.getByLabelText('Dirección de Google'), {
    target: { value: text },
  })

const addButton = () =>
  screen.getByRole('button', { name: /Agregar|Guardando/ })

describe('AdminsScreen', () => {
  it('waits out loud while it reads the list', () => {
    show({ load: () => new Promise(() => undefined) })

    expect(
      screen.getByText('Cargando la lista de administradores…'),
    ).toBeVisible()
  })

  it('says why it could not read the list', async () => {
    show({
      load: () =>
        Promise.resolve({
          ok: false,
          because:
            'Esta versión del sitio se publicó sin la conexión a la base.',
        }),
    })

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No pudimos leer la lista de administradores: Esta versión del sitio se publicó sin la conexión a la base.',
    )
  })

  it('names the three roles and what each may do, and offers no fourth', async () => {
    show()

    const table = await screen.findByRole('table')
    expect(within(table).getByText('Acceso total.')).toBeVisible()
    expect(
      within(table).getByText('Equipos, fixture, resultados y estadísticas.'),
    ).toBeVisible()
    expect(within(table).getByText('Noticias, fotos y sponsors.')).toBeVisible()
    // Three roles plus the header row.
    expect(within(table).getAllByRole('row')).toHaveLength(4)
  })

  it('explains an empty list instead of looking broken, because the founding owner has no row', async () => {
    show({ admins: [] })

    expect(
      await screen.findByText(/La lista está vacía, y no es un error/),
    ).toBeVisible()
    expect(
      screen.getByText(/su acceso está escrito en la base misma/),
    ).toBeVisible()
    // And it still offers the form: an empty table is exactly what the first
    // administrator is added to.
    expect(addButton()).toBeVisible()
  })

  it('says the signed-in person is missing from the list on purpose', async () => {
    show({ admins: [record()], email: 'lafundadora@example.com' })

    expect(
      await screen.findByText(/Tu cuenta no figura en esta lista/),
    ).toBeVisible()
  })

  it('says nothing of the sort when the signed-in person is in the list', async () => {
    show({ admins: [record()], email: 'Deportiva@Example.com' })

    await screen.findByText('Gestión Deportiva')
    expect(screen.queryByText(/Tu cuenta no figura/)).toBeNull()
  })

  it('adds an address typed in mixed case, folded to lower case', async () => {
    const { add } = show()
    await screen.findByLabelText('Dirección de Google')

    typeAddress('  Nombre.Apellido@Gmail.COM  ')
    fireEvent.change(screen.getByLabelText('Nombre (opcional)'), {
      target: { value: 'Ana Pérez' },
    })
    fireEvent.click(screen.getByRole('radio', { name: 'Gestión deportiva' }))
    fireEvent.click(addButton())

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Agregamos a la persona con el rol de Gestión deportiva.',
    )
    expect(add).toHaveBeenCalledWith({
      email: 'nombre.apellido@gmail.com',
      role: 'sporting_management',
      display_name: 'Ana Pérez',
      active: true,
    })
    // And the person is now in the list, without a second read.
    expect(screen.getByText('Ana Pérez')).toBeVisible()
  })

  it('refuses an address already in the list instead of letting the key refuse it', async () => {
    const { add } = show({ admins: [record()] })
    await screen.findByLabelText('Dirección de Google')

    typeAddress('Deportiva@Example.com')

    expect(screen.getByText(/Esa dirección ya está en la lista/)).toBeVisible()
    expect(addButton()).toBeDisabled()
    expect(add).not.toHaveBeenCalled()
  })

  it('refuses an address whose access was withdrawn, and says to give it back', async () => {
    show({ admins: [record({ active: false })] })
    await screen.findByLabelText('Dirección de Google')

    typeAddress('deportiva@example.com')

    expect(
      screen.getByText(/devolvele el acceso si se lo retiraron/),
    ).toBeVisible()
  })

  it('refuses something that is not an address', async () => {
    show()
    await screen.findByLabelText('Dirección de Google')

    typeAddress('nadie')

    expect(
      screen.getByText(/Eso no parece una dirección de correo/),
    ).toBeVisible()
    expect(addButton()).toBeDisabled()
  })

  it('does not open complaining about an empty form', async () => {
    show()

    await screen.findByLabelText('Dirección de Google')
    expect(screen.queryByText(/Escribí la dirección/)).toBeNull()
    expect(addButton()).toBeDisabled()
  })

  it('withdraws access by clearing the flag, and never offers to delete', async () => {
    const { change } = show({ admins: [record()] })

    fireEvent.click(
      await screen.findByRole('button', {
        name: 'Retirar el acceso de Gestión Deportiva',
      }),
    )

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Retiramos el acceso. La fila queda en la lista.',
    )
    expect(change).toHaveBeenCalledWith({
      email: 'deportiva@example.com',
      role: 'sporting_management',
      display_name: 'Gestión Deportiva',
      active: false,
    })
    // The row is still there, marked, which is what the column comment asks for.
    expect(
      within(rowOf('Gestión Deportiva')).getByText('Sin acceso'),
    ).toBeVisible()
    expect(screen.queryByRole('button', { name: /Borrar|Eliminar/ })).toBeNull()
  })

  it('gives access back to somebody who had it withdrawn', async () => {
    const { change } = show({ admins: [record({ active: false })] })

    fireEvent.click(
      await screen.findByRole('button', {
        name: 'Devolver el acceso a Gestión Deportiva',
      }),
    )

    expect(change).toHaveBeenCalledWith(
      expect.objectContaining({ active: true }),
    )
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Devolvimos el acceso.',
    )
  })

  it('changes a role', async () => {
    const { change } = show({ admins: [record()] })

    fireEvent.change(
      await screen.findByRole('combobox', { name: 'Rol de Gestión Deportiva' }),
      { target: { value: 'communications' } },
    )

    expect(change).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'deportiva@example.com',
        role: 'communications',
      }),
    )
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Cambiamos el rol a Comunicación.',
    )
  })

  it('reports a refusal by row level security as a permission, not as a crash', async () => {
    show({
      admins: [record()],
      add: refusing(
        'La base rechazó el cambio: solo la administración general puede modificar quién administra la liga.',
      ),
    })
    await screen.findByLabelText('Dirección de Google')

    typeAddress('otra@example.com')
    fireEvent.click(addButton())

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'solo la administración general puede modificar quién administra la liga',
    )
    // Nothing was added to the list on screen either.
    expect(screen.queryByText('otra@example.com')).toBeNull()
  })

  it('reports the key refusing a duplicate two people asked for at once', async () => {
    show({
      add: refusing(
        'Esa dirección ya está en la lista. Cambiale el rol en su fila, o devolvele el acceso si se lo retiraron.',
      ),
    })
    await screen.findByLabelText('Dirección de Google')

    typeAddress('otra@example.com')
    fireEvent.click(addButton())

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Esa dirección ya está en la lista',
    )
  })

  it('shows a role that cannot write this table why, and no form at all', async () => {
    show({ admins: [record()], role: 'sporting_management' })

    expect(
      await screen.findByText(
        /la base solo acepta cambios acá de la administración general/,
      ),
    ).toBeVisible()
    expect(screen.queryByLabelText('Dirección de Google')).toBeNull()
    expect(
      screen.queryByRole('button', { name: /Retirar el acceso/ }),
    ).toBeNull()
    // The list itself is theirs to read: admins_select_self_or_admin allows it.
    expect(screen.getByText('Gestión Deportiva')).toBeVisible()
    expect(
      screen.getByRole('combobox', { name: 'Rol de Gestión Deportiva' }),
    ).toBeDisabled()
  })

  it('shows communications the same thing', async () => {
    show({ role: 'communications' })

    expect(await screen.findByText(/Tu rol es Comunicación/)).toBeVisible()
    expect(screen.queryByLabelText('Dirección de Google')).toBeNull()
  })

  it('says out loud that withdrawing is not deleting', async () => {
    show()

    expect(
      await screen.findByText(/la fila queda marcada sin acceso/),
    ).toBeVisible()
    expect(screen.getByText(/no hay forma de borrar a nadie/)).toBeVisible()
  })
})
