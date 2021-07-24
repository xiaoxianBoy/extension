import React, { useState } from 'react';
import PropTypes from 'prop-types';
import SharedSlideUpMenu from '../Shared/SharedSlideUpMenu';
import TopMenuProtocolList from '../TopMenu/TopMenuProtocolList';
import TopMenu from '../TopMenu/TopMenu';
import TabBar from '../TabBar/TabBar';

export default function CorePageWithTabs(props) {
  const { children } = props;

  const [isProtocolListOpen, setIsProtocolListOpen] = useState(false);

  return (
    <main>
      <SharedSlideUpMenu
        isOpen={isProtocolListOpen}
        close={() => {
          setIsProtocolListOpen(false);
        }}
      >
        <TopMenuProtocolList />
      </SharedSlideUpMenu>
      <div className="page">
        <button
          type="button"
          className="trigger"
          onClick={() => {
            setIsProtocolListOpen(!isProtocolListOpen);
          }}
        >
          <TopMenu />
        </button>
        <div className="page_content">{children}</div>
        <TabBar />
      </div>
      <style jsx>
        {`
          .page {
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            align-items: center;
            height: 100vh;
            width: 100vw;
          }
          .page_content {
            height: 480px;
            overflow-y: scroll;
            display: flex;
            justify-content: center;
            flex-grow: 1;
            margin: 0 auto;
          }
        `}
      </style>
    </main>
  );
}

CorePageWithTabs.propTypes = {
  children: PropTypes.node.isRequired,
};