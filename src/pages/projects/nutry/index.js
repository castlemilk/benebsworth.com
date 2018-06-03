import React from 'react';
import Link from 'gatsby-link';
import { addLocaleData } from 'react-intl';
import localeData from 'react-intl/locale-data/en';
import Nutry from '../../../components/Projects/Nutry';
import { IntlProvider } from 'react-intl';

addLocaleData(localeData);

const NutryIndexPage = () => (
  <div>
      <IntlProvider locale={'en'} >
        <Nutry />
      </IntlProvider>
  </div>
)

export default NutryIndexPage
