import { useLayoutEffect, useCallback } from 'react'

const useOutsideClick = (ref:any ,handler:any, activeWhen:any) => {
  const handle = useCallback(
    e => ref && ref.current && !ref.current.contains(e.target) && handler(e),
    [handler, ref]
  )

  useLayoutEffect(() => {
    activeWhen && document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [activeWhen, handle])
}

export default useOutsideClick
