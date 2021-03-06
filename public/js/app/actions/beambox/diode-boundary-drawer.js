define([
    'app/actions/beambox/constant',
    'app/actions/beambox/beambox-preference',
], function (
    Constant,
    BeamboxPreference
) {
    let diodeBoundaryPath, diodeBoundarySvg;
    const createBoundary = () => {
        diodeBoundarySvg = document.createElementNS(window.svgedit.NS.SVG, 'svg');
        diodeBoundaryPath = document.createElementNS(window.svgedit.NS.SVG, 'path');
        $('#canvasBackground').append(diodeBoundarySvg);
        diodeBoundarySvg.appendChild(diodeBoundaryPath);
        $(diodeBoundarySvg).attr({
            'id': 'diode-boundary',
            'width': '100%',
            'height': '100%',
            'viewBox': `0 0 ${Constant.dimension.getWidth()} ${Constant.dimension.getHeight()}`,
            'x': 0,
            'y': 0,
            'style': 'pointer-events:none',
        });
        $(diodeBoundaryPath).attr({
            'fill': '#CCC',
            'fill-opacity': 0.4,
            'fill-rule': 'evenodd',
            'stroke': 'none',
            'style': 'pointer-events:none',
        });
    };
    //console.log(diodeBoundaryPath);
    const show = () => {
        if (!diodeBoundaryPath) createBoundary();
        const w = Constant.dimension.getWidth();
        const h = Constant.dimension.getHeight();
        const limitXR = Constant.diode.limitX * Constant.dpmm;
        const limitYB = Constant.diode.limitY * Constant.dpmm;
        const OffsetX = BeamboxPreference.read('diode_offset_x');
        const OffsetY = BeamboxPreference.read('diode_offset_y');
        const limitXL = (OffsetX !== undefined ? OffsetX : Constant.diode.defaultOffsetX)* Constant.dpmm;
        const limitYT = (OffsetY !== undefined ? OffsetY : Constant.diode.defaultOffsetY)* Constant.dpmm;
        const d = `M${w},${h}L0,${h}L0,0L${w},${0}zM${limitXL},${limitYT}L${w - limitXR},${limitYT}L${w - limitXR},${h - limitYB}L${limitXL},${h - limitYB}z`;
        $(diodeBoundaryPath).attr('d', d);
    };
    const hide = () => {
        if (!diodeBoundaryPath) return;
        $(diodeBoundaryPath).attr('d', '');
    }

    return {
        show,
        hide
    };
});
