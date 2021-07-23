export function getFilterTitle(title = '', intl:any) {
    return intl.messages[title] ? intl.formatMessage({ id: title }) : title
  }
  
  export const HEADER_SCROLL_OFFSET = 90
  