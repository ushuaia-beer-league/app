import { friendlyChannelLabel } from './public-content'

describe('friendlyChannelLabel', () => {
  it('leaves a real name alone', () => {
    expect(friendlyChannelLabel('Instagram', 'https://instagram.com/ubl')).toBe(
      'Instagram',
    )
  })

  it('names the platform when the label is its own address', () => {
    // The first thing an operator did: paste the address into both fields. The
    // page must not print HTTPS://WWW.INSTAGRAM.COM/... as a name.
    expect(
      friendlyChannelLabel(
        'https://www.instagram.com/ushuaiabeerleague/',
        'https://www.instagram.com/ushuaiabeerleague/',
      ),
    ).toBe('Instagram')
  })

  it('shows the address itself for a mail channel', () => {
    expect(
      friendlyChannelLabel(
        'mailto:ushuaiabl@gmail.com',
        'mailto:ushuaiabl@gmail.com',
      ),
    ).toBe('ushuaiabl@gmail.com')
  })

  it('falls back to the hostname for a place it does not know', () => {
    expect(
      friendlyChannelLabel(
        'https://tierradelfuego.gob.ar/x',
        'https://tierradelfuego.gob.ar/x',
      ),
    ).toBe('tierradelfuego.gob.ar')
  })
})
