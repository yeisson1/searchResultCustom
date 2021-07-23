import { zip } from 'ramda'
import { useFilterNavigator } from '../FilterSideBar/FilterNavigatorContext'
import { isSameMap } from '../utils/queryAndMapUtils'

/**
 * This hook is required because we make the facets query
 * with only the categories and fulltext parameters, so we
 * need to calculate manually if the other filters are selected
 */
const useSelectedFilters = (facets:any) => {
  const { query, map }:any = useFilterNavigator()
  if (query == null && map == null) {
    return []
  }

  const queryAndMap = zip(
    query
      .toLowerCase()
      .split('/')
      .map(decodeURIComponent),
    map.split(',')
  )

  return facets.map((facet:any) => {
    const currentFacetSlug = decodeURIComponent(facet.value).toLowerCase()

    const isSelected =
      queryAndMap.find(
        ([slug, slugMap]) =>
          slug === currentFacetSlug && isSameMap(slugMap as any, facet.map)
      ) !== undefined

    return {
      ...facet,
      selected: isSelected,
    }
  })
}

export default useSelectedFilters
