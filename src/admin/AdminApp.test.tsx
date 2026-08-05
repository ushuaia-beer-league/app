import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AdminApp } from './AdminApp'

/**
 * These cases exist because the panel shipped unreachable.
 *
 * Every screen was built and tested on its own, and every one of them answered
 * "todavía no construimos esta pantalla" in production. `main.tsx` mounts
 * `AdminApp` under `path="/admin/*"`, which makes the `Routes` inside it a
 * descendant: it matches against what is left of the path after the parent
 * consumed `/admin`, so a route declared as `/admin/equipos` in there matches
 * nothing and the catch-all answers instead.
 *
 * Nothing caught it. The screens' own tests render the screens, not the routing,
 * and a test that rendered `AdminApp` on its own would have passed with the
 * absolute paths, because then there is no parent to consume anything. So the
 * whole point of this file is that it mounts the panel **the way production
 * mounts it**, parent route and all.
 */

vi.mock('./useAdminSession', async () => {
  const actual =
    await vi.importActual<typeof import('./useAdminSession')>(
      './useAdminSession',
    )
  return {
    ...actual,
    useAdminSession: () => ({
      status: {
        state: 'ready' as const,
        email: 'general@example.com',
        role: 'general_administrator' as const,
      },
      signIn: vi.fn(),
      signOut: vi.fn(),
      error: null,
    }),
  }
})

/** The panel as `main.tsx` builds it: the admin under a parent route. */
function mountLikeProduction(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/admin/*" element={<AdminApp />} />
        <Route path="*" element={<p>the public site</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

const NOT_BUILT = /todavía no construimos/i

beforeEach(() => {
  vi.clearAllMocks()
})

describe('the panel mounted the way production mounts it', () => {
  it.each([
    ['/admin', /partidos/i],
    ['/admin/equipos', /equipos/i],
    ['/admin/fixture', /fixture/i],
    ['/admin/sponsors', /sponsors/i],
    ['/admin/fotos', /fotos/i],
    ['/admin/temporadas', /temporadas/i],
    ['/admin/administradores', /administradores/i],
    ['/admin/visitas', /visitas/i],
  ])('reaches a real screen at %s', (path) => {
    mountLikeProduction(path)

    // The screens read from a database this test has no connection to, so each
    // one shows its own loading or its own "no connection". Any of those is a
    // screen. What must never appear is the catch-all.
    expect(screen.queryByText(NOT_BUILT)).toBeNull()
  })

  it('still answers the catch-all for a path the panel does not have', () => {
    mountLikeProduction('/admin/no-existe')

    expect(screen.getByText(NOT_BUILT)).toBeVisible()
  })

  it('leaves anything outside /admin to the public site', () => {
    mountLikeProduction('/')

    expect(screen.getByText('the public site')).toBeVisible()
  })
})
