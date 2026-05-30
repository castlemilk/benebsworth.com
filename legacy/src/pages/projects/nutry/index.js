import React from 'react'
import Link from 'gatsby-link'
import {createIntl, createIntlCache, RawIntlProvider} from 'react-intl'
import localeData from 'react-intl/lib/'
import Nutry from '../../../components/Projects/Nutry'
import { IntlProvider } from 'react-intl'
// This is optional but highly recommended
// since it prevents memory leak
const cache = createIntlCache()
const intl = createIntl({
  locale: 'en',
  messages: {}
}, cache)

const NutryIndexPage = () => (
  <div>
    <RawIntlProvider value={intl}>
      <Nutry />
    </RawIntlProvider>
  </div>
)

export default NutryIndexPage
