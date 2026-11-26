import { useEffect, useState } from 'react'

export function usePlayerResource<Data>(load: () => Promise<Data>) {
  const [revision, setRevision] = useState(0)
  const [result, setResult] = useState<{
    load: () => Promise<Data>
    revision: number
    data: Data | null
    failed: boolean
  } | null>(null)

  useEffect(() => {
    let current = true
    void load().then(
      (data) => {
        if (current) setResult({ load, revision, data, failed: false })
      },
      () => {
        if (current) setResult({ load, revision, data: null, failed: true })
      },
    )
    return () => {
      current = false
    }
  }, [load, revision])

  const latest =
    result?.load === load && result.revision === revision ? result : null
  return {
    data: latest?.data ?? null,
    failed: latest?.failed ?? false,
    loading: latest === null,
    reload: () => setRevision((value) => value + 1),
  }
}
