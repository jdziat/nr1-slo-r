import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { StackItem, Button, UserStorageMutation, UserStorageQuery } from 'nr1';
import { EmptyState } from '@newrelic/nr1-community';
import { Multiselect } from 'react-widgets';
import isEqual from 'lodash.isequal';

import SloList from './slo-list';
import MainContent from './main-container';

const SLO_COLLECTION_KEY = 'slo_collection_v1';
const SLO_DOCUMENT_ID = 'slo_document';

export default class MainView extends Component {
  constructor(props) {
    super(props);
    this.state = {
      selectedSlosIds: [],
      aggregatedIds: [],
      isProcessing: true,
      selectedTags: [],
      filteredSlos: [],
      isSaving: false
    };
  }

  componentDidMount = async () => {
    try {
      const {data} = await UserStorageQuery.query({
        collection: SLO_COLLECTION_KEY,
        documentId: SLO_DOCUMENT_ID
      });
      this.setState({
        aggregatedIds: data.selectedIds,
        selectedSlosIds: data.selectedIds
      });
    }finally {
      this.setState({
        isProcessing: false
      });
    }
  };

  componentDidUpdate = prevProps => {
    if (!this.areSlosEqual(prevProps.slos, this.props.slos)) {
      const { selectedSlosIds } = this.state;
      this.clearSelectionForNonExisting(selectedSlosIds);
    }
  };

  areSlosEqual = (newSlos, prevSlos) => {
    if (newSlos.length !== prevSlos.length) {
      return false;
    }

    return isEqual(newSlos, prevSlos);
  };

  clearSelectionForNonExisting = selectedIds => {
    const { slos } = this.props;

    if (slos) {
      const filteredIds = [];
      selectedIds.forEach(id => {
        const index = slos.findIndex(slo => slo.id === id);

        if (index >= 0) {
          filteredIds.push(id);
        }
      });

      this.setState({
        aggregatedIds: filteredIds,
        selectedSlosIds: filteredIds
      });
    }
    return selectedIds;
  };

  handleSelectSlo = (id, isSelected) => {
    this.setState(prevState => {
      let newSelectedSlosIds = [];

      if (isSelected) {
        newSelectedSlosIds = prevState.selectedSlosIds.filter(
          item => item !== id
        );
      } else {
        newSelectedSlosIds = [...prevState.selectedSlosIds, id];
      }

      return {
        ...prevState,
        selectedSlosIds: newSelectedSlosIds
      };
    });
  };

  handleSelectTag = selectedTag => {
    const { slos } = this.props;
    const { selectedTags } = this.state;

    let currentSelectedTags = selectedTags;
    currentSelectedTags = [...selectedTag];

    this.setState({
      selectedTags: currentSelectedTags
    });

    if (currentSelectedTags.length > 0) {
      const filteredByTag = [];
      let sloTags = [];
      let selectedTags = [];

      selectedTags = currentSelectedTags.map(
        ({ key, values }) => `${key}:${values[0]}`
      );

      slos.forEach(slo => {
        const { tags } = slo.document;

        if (tags) {
          sloTags = tags.map(({ key, values }) => `${key}:${values[0]}`);

          if (
            selectedTags.every(selectedTag => sloTags.includes(selectedTag))
          ) {
            filteredByTag.push(slo);
          }
        }
      });

      this.setState({
        filteredSlos: [...filteredByTag]
      });
    } else {
      this.setState({
        filteredSlos: []
      });
    }
  };

  handleSave = async () => {
    this.setState({
      isSaving: true
    });

    await UserStorageMutation.mutate({
      actionType: UserStorageMutation.ACTION_TYPE.WRITE_DOCUMENT,
      collection: SLO_COLLECTION_KEY,
      documentId: SLO_DOCUMENT_ID,
      document: { selectedIds: this.state.selectedSlosIds }
    });

    this.setState(prevState => ({
      aggregatedIds: prevState.selectedSlosIds,
      isSaving: false
    }));
  };

  render() {
    const {
      isProcessing,
      selectedSlosIds,
      selectedTags,
      filteredSlos,
      aggregatedIds
    } = this.state;

    const { slos, timeRange, tags } = this.props;

    let noSlosSelected = null;

    if (aggregatedIds.length === 0 && !isProcessing) {
      noSlosSelected = (
        <EmptyState
          buttonText=""
          heading="No SLOs selected"
          description="Combine SLOs by selecting them from left sidebar."
        />
      );
    }

    return (
      <>
        <StackItem className="slos-container">
          <Multiselect
            data={tags}
            value={selectedTags}
            textField={entityTag => `${entityTag.key}=${entityTag.values[0]}`}
            valueField={entityTag => `${entityTag.key}=${entityTag.values[0]}`}
            onChange={value => this.handleSelectTag(value)}
            placeholder="Filter SLO by Tags"
            containerClassName="slos-container__multiselect"
          />
          <SloList
            slos={selectedTags.length === 0 ? slos : filteredSlos}
            selectedSlosIds={selectedSlosIds}
            handleSelectSlo={this.handleSelectSlo}
          />
          {!isEqual(selectedSlosIds.sort(), aggregatedIds.sort()) && (
            <div className="slos-container__buttons">
              <Button
                type={Button.TYPE.NORMAL}
                className="button"
                onClick={() =>
                  this.setState({
                    selectedSlosIds: aggregatedIds
                  })
                }
              >
                Cancel
              </Button>
              <Button
                type={Button.TYPE.PRIMARY}
                className="button"
                loading={this.state.isSaving}
                onClick={this.handleSave}
              >
                Save
              </Button>
            </div>
          )}
        </StackItem>
        <StackItem grow className="main-content-container">
          {noSlosSelected}
          <MainContent
            timeRange={timeRange}
            slos={slos.filter(slo => aggregatedIds.includes(slo.id))}
          />
        </StackItem>
      </>
    );
  }
}

MainView.propTypes = {
  slos: PropTypes.array.isRequired,
  timeRange: PropTypes.object,
  tags: PropTypes.array.isRequired
};
