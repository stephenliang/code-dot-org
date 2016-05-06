/** @file SVG Visualization Overlay */

/**
 * Overlay for the play space that helps render additional UI (like the
 * crosshair and element tooltips).  Main responsibilities for this class are:
 *   Rendering root SVG for overlays
 *   Efficiently transforming mouse position into app-space
 * @constructor
 */
let VisualizationOverlay = React.createClass({
  propTypes: {
    width: React.PropTypes.number.isRequired,
    height: React.PropTypes.number.isRequired
  },

  getInitialState: () => ({
    /** @type {number} */
    mouseX: -1,
    /** @type {number} */
    mouseY: -1,
    /** @type {SVGMatrix} */
    screenSpaceToAppSpaceTransform: null
  }),

  componentDidMount() {
    /** @private {SVGPoint} Build a reusable position point for efficient transforms */
    this.mousePos_ = this.refs.root.createSVGPoint();
    this.recalculateTransform();

    // Note: This is currently used within a ProtectedStatefulDiv, so we need
    // to hook up our own handlers that trigger updates (based on state) instead
    // of depending on props passed in - hence, these globals.
    window.addEventListener('resize', this.recalculateTransform);
    document.addEventListener('mousemove', this.onMouseMove);
  },

  componentWillReceiveProps(nextProps) {
    if (this.props.width !== nextProps.width || this.props.height !== nextProps.height) {
      this.recalculateTransform();
    }
  },

  componentWillUnmount() {
    document.removeEventListener('mousemove', this.onMouseMove);
  },

  recalculateTransform() {
    var svg = this.refs.root;
    var clientRect = svg.getBoundingClientRect();
    var screenSpaceToAppSpaceTransform = svg.createSVGMatrix()
        .scale(this.props.width / clientRect.width)
        .translate(-clientRect.left, -clientRect.top);
    this.setState({ screenSpaceToAppSpaceTransform });
  },

  onMouseMove(event) {
    var screenSpaceToAppSpaceTransform = this.state.screenSpaceToAppSpaceTransform;
    this.mousePos_.x = event.clientX;
    this.mousePos_.y = event.clientY;
    this.mousePos_ = this.mousePos_.matrixTransform(screenSpaceToAppSpaceTransform);
    this.setState({
      mouseX: this.mousePos_.x,
      mouseY: this.mousePos_.y
    });

    // if (this.shouldShowCrosshair_()) {
    //   this.crosshairOverlay_.onSvgMouseMove(event);
    // }
  },

  render() {
    return (
      <svg
          ref="root"
          id="visualizationOverlay"
          version="1.1"
          baseProfile="full"
          xmlns="http://www.w3.org/2000/svg"
          width={this.props.width}
          height={this.props.height}
          viewBox={"0 0 " + this.props.width + " " + this.props.height}
          pointerEvents="none"
      >
        <g>
          <text x="50" y="50">{this.state.mouseX + ', ' + this.state.mouseY}</text>}
        </g>
      </svg>
    );
  }
});
export default VisualizationOverlay;
