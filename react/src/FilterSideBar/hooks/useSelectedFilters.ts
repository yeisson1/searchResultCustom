import { zip } from 'ramda'
import { useContext } from 'react'
import slugify from 'slugify'

import QueryContext from '../QueryContext'

export function generateSlug(str:any) {
  return slugify(str, { lower: true, remove: /[*+~.()'"!:@]/g })
}

/**
 * This hook is required because we make the facets query
 * with only the categories and fulltext parameters, so we
 * need to calculate manually if the other filters are selected
 */
const useSelectedFilters = (facets:any) => {
  const { query, map } = useContext(QueryContext) as any

  const queryAndMap = zip(
    query
      .toLowerCase()
      .split('/')
      .map((str:any) => generateSlug(decodeURIComponent(str))),
    map.split(',')
  )

  return facets.map((facet:any) => {
    const currentFacetSlug = decodeURIComponent(facet.value).toLowerCase()

    const isSelected =
      queryAndMap.find(
        ([slug, slugMap]) => slug === currentFacetSlug && slugMap === facet.map
      ) !== undefined

    return {
      ...facet,
      selected: isSelected,
    }
  })
}

export default useSelectedFilters
