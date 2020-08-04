import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Grid } from 'nr1';

import ErrorBudgetSLO from '../../../shared/queries/error-budget-slo/single-document';
import AlertDrivenSLO from '../../../shared/queries/alert-driven-slo/single-document';
import SloGridTags from './slo-grid-tags/slo-grid-tags';
import SloTileWrapper from './slo-tile-wrapper';

export default class MainView extends Component {
  render() {
    const { slos, timeRange } = this.props;

    return (
      <Grid
        className="grid-container"
        spacingType={[Grid.SPACING_TYPE.EXTRA_LARGE]}
      >
        {slos.map((slo, index) => (
          <SloTileWrapper key={index} timeRange={timeRange} slo={slo} />
        ))}
      </Grid>
    );
  }
}

MainView.propTypes = {
  slos: PropTypes.array.isRequired
};
