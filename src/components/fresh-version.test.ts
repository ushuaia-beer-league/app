import { isStale, runningVersion } from './fresh-version'

describe('runningVersion', () => {
  it('reads the entry script out of a built module URL', () => {
    expect(runningVersion('https://ubl.com.ar/assets/index-CyvCKNxK.js')).toBe(
      'index-CyvCKNxK.js',
    )
  })

  it('answers nothing in development, where no asset is hashed', () => {
    // The banner must be silent there rather than comparing against a name
    // that does not exist.
    expect(runningVersion('http://localhost:5173/src/main.tsx')).toBeNull()
  })
})

describe('isStale', () => {
  it('is true only when both are known and they differ', () => {
    expect(isStale('index-aaa.js', 'index-bbb.js')).toBe(true)
    expect(isStale('index-aaa.js', 'index-aaa.js')).toBe(false)
  })

  it('says nothing when either side is unknown', () => {
    // A failed fetch or a development build: a courtesy that cries wolf is
    // worse than none.
    expect(isStale(null, 'index-bbb.js')).toBe(false)
    expect(isStale('index-aaa.js', null)).toBe(false)
  })

  it('says nothing when the answer is the SPA rewrite wearing a costume', () => {
    // Every absent path on this host answers HTML with a 200, so version.txt
    // can come back as a web page. That must read as "cannot say", never as a
    // new version.
    expect(isStale('index-aaa.js', '<!doctype html>')).toBe(false)
    expect(isStale('index-aaa.js', 'index-bbb.css')).toBe(false)
    expect(isStale('index-aaa.js', '')).toBe(false)
  })
})
