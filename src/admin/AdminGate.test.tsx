import { fireEvent, render, screen } from '@testing-library/react'
import { AdminGate } from './AdminGate'

const noop = () => undefined

const gate = (props: Partial<Parameters<typeof AdminGate>[0]> = {}) =>
  render(
    <AdminGate
      status={{ state: 'signed-out' }}
      error={null}
      onSignIn={noop}
      onSignOut={noop}
      {...props}
    >
      <p>El panel</p>
    </AdminGate>,
  )

describe('AdminGate', () => {
  it('offers Google to somebody who has not signed in', () => {
    const signIn = vi.fn()
    gate({ onSignIn: signIn })

    fireEvent.click(screen.getByRole('button', { name: 'Ingresar con Google' }))

    expect(signIn).toHaveBeenCalledOnce()
    expect(screen.queryByText('El panel')).toBeNull()
  })

  it('says there is nothing to sign in to when the build has no connection', () => {
    gate({ status: { state: 'unconfigured' } })

    expect(screen.getByText(/sin la conexión a la base/)).toBeVisible()
    // And it says the public site is fine, because it is.
    expect(screen.getByText(/última copia guardada/)).toBeVisible()
    expect(
      screen.queryByRole('button', { name: 'Ingresar con Google' }),
    ).toBeNull()
  })

  it('names the account it turned away, and offers a way out', () => {
    const signOut = vi.fn()
    gate({
      status: { state: 'not-an-admin', email: 'alguien@example.com' },
      onSignOut: signOut,
    })

    expect(screen.getByText('alguien@example.com')).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Salir' }))

    expect(signOut).toHaveBeenCalledOnce()
    expect(screen.queryByText('El panel')).toBeNull()
  })

  it('shows what went wrong on the last attempt', () => {
    gate({ error: 'No pudimos abrir el ingreso con Google.' })

    expect(screen.getByRole('alert')).toHaveTextContent(
      'No pudimos abrir el ingreso',
    )
  })

  it('says nothing but waits while it asks', () => {
    gate({ status: { state: 'loading' } })

    expect(screen.getByText('Verificando tu ingreso…')).toBeVisible()
    expect(screen.queryByText('El panel')).toBeNull()
  })

  it('lets an administrator through', () => {
    gate({
      status: {
        state: 'ready',
        email: 'ushuaiabl@example.com',
        role: 'general_administrator',
      },
    })

    expect(screen.getByText('El panel')).toBeVisible()
  })
})
