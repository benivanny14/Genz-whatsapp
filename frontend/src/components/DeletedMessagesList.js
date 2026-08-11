import React from 'react';

/**
 * Deleted-messages list body for the GENZMods modal.
 *
 * Rendered as a child of a scoped ErrorBoundary so that a render error
 * (e.g. a malformed `messages` payload) is thrown from THIS component's
 * render scope and can be caught — an error thrown from the parent's own
 * render cannot be caught by a boundary that lives inside the parent.
 *
 * Written without JSX (React.createElement) so the plain `node --test`
 * frontend test runner can import and exercise it directly.
 */
const DeletedMessagesList = ({ messages, onRestore }) =>
  React.createElement(
    'div',
    { className: 'flex-1 overflow-y-auto p-4' },
    messages.length === 0
      ? React.createElement('p', { className: 'text-gray-500 text-center py-8' }, 'No deleted messages found')
      : React.createElement(
          'div',
          { className: 'space-y-3' },
          messages.map((msg) =>
            React.createElement(
              'div',
              { key: msg.id, className: 'bg-gray-100 dark:bg-gray-700 rounded-lg p-3' },
              React.createElement(
                'p',
                { className: 'text-sm text-gray-900 dark:text-white mb-2' },
                msg.originalContent || msg.content
              ),
              React.createElement(
                'div',
                { className: 'flex items-center justify-between' },
                React.createElement(
                  'span',
                  { className: 'text-xs text-gray-500' },
                  msg.timestamp ? new Date(msg.timestamp).toLocaleString() : ''
                ),
                React.createElement(
                  'button',
                  {
                    onClick: () => onRestore(msg.id),
                    className: 'text-xs text-blue-600 hover:text-blue-700'
                  },
                  'Restore'
                )
              )
            )
          )
        )
  );

export default DeletedMessagesList;
