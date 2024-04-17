export const GRAPH_COMPONENT_STATE = {
    COMPONENT_WILL_MOUNT: 'componentWillMount',
    COMPONENT_DID_MOUNT: 'componentDidMount',
    GRAPH_DID_RENDER: 'graphDidRender',
} as const;

export type GraphComponentState = typeof GRAPH_COMPONENT_STATE[keyof typeof GRAPH_COMPONENT_STATE];