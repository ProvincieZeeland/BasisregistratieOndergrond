let viewer,
	tilesetGeoTop,
	tilesetBHR;

const geoTopVisualisations = {
	fixed: "Ravijn vast",
	cursor: "Ravijn cursor",
	hole: "Gat",
	full: "Volledig",
};
const viewModel = {
	showBHR: false,
	showGeoTop: true,
	geoTopVisualisations: Object.values(geoTopVisualisations),
	currentGeoTopVisualisation: Object.values(geoTopVisualisations)[0],
};

(function () {
	"use strict";


	/**
	 *  username: wko
	 *  password: CesiumION
	 */
	Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIzNzFmNjQzYi1iOTBhLTQ3OTctYThjNy0xOWU4NWEwOTgyNTQiLCJpZCI6Mjc3MzEsInNjb3BlcyI6WyJhc2wiLCJhc3IiLCJhc3ciLCJnYyJdLCJpYXQiOjE1OTE3MDI2MzZ9.4MzPdhl4tZ8mo0uWgrVZlGLffdF-BRvqYn4hiO8-hnU';


	/**
	 *  Create the viewer object
	 */
	viewer = new Cesium.Viewer('cesiumContainer', {
		baseLayerPicker: true,
		timeline: false,
		animation: false,
		// terrainProvider: Cesium.createWorldTerrain(),
		terrainProvider: new Cesium.CesiumTerrainProvider({
			url: Cesium.IonResource.fromAssetId(915467),
		}),
		// terrainProvider: new Cesium.CesiumTerrainProvider({
		// 	url: Cesium.IonResource.fromAssetId(915478),
		// }),
		orderIndependentTranslucency: true
	});
	viewer.scene.debugShowFramesPerSecond = true;

	var ellipsoid = viewer.scene.globe.ellipsoid;
	viewer.scene.screenSpaceCameraController.enableCollisionDetection = false;

	viewer.scene.globe.showGroundAtmosphere = true;
	viewer.scene.globe.baseColor = Cesium.Color.BLACK;
	viewer.scene.globe.undergroundColor = Cesium.Color.BLACK;

	//viewer.scene.globe.translucency.enabled = true;
	//viewer.scene.globe.undergroundColor = undefined;
	//viewer.scene.globe.translucency.frontFaceAlpha = 0;
	//viewer.scene.globe.translucency.backFaceAlpha = 0.5;

	//viewer.scene.globe.frontFaceAlphaByDistance = new Cesium.NearFarScalar(400.0, 0.0, 800.0, 1.0);
	//viewer.scene.globe.backFaceAlphaByDistance = new Cesium.NearFarScalar(400, 0.5, 800, 1.0);

	//viewer.scene.globe.translucency.rectangle = Cesium.Rectangle.fromDegrees(-120.0,0.0,-30.0,45.0);

	const toolbar = document.getElementById('toolbar');
	Cesium.knockout.track(viewModel);
	Cesium.knockout.applyBindings(viewModel, toolbar);

	Cesium.knockout
		.getObservable(viewModel, "showBHR")
		.subscribe(function (on) {
			if (on) {
				addBHR();
			} else {
				viewer.scene.primitives.remove(tilesetBHR);
			}
		});

	Cesium.knockout
		.getObservable(viewModel, "showGeoTop")
		.subscribe(function (on) {
			if (on) {
				addGeoTop();
			} else {
				viewer.scene.primitives.remove(tilesetGeoTop);
			}
			setClippingPlanes();
		});

	Cesium.knockout
		.getObservable(viewModel, "currentGeoTopVisualisation")
		.subscribe(function (value) {
			setClippingPlanes();
		});

	function setClippingPlanes() {
		const enabled = viewModel.showGeoTop && viewModel.currentGeoTopVisualisation !== geoTopVisualisations.full;
		if (tilesetGeoTop && tilesetGeoTop.clippingPlanes) {
			tilesetGeoTop.clippingPlanes.enabled = enabled;
		}
		if (viewer.scene.globe.clippingPlanes) {
			viewer.scene.globe.clippingPlanes.enabled = enabled;
		}
	}

	function addBHR() {
		tilesetBHR = viewer.scene.primitives.add(new Cesium.Cesium3DTileset({
			url: 'data/BHR Cesium Tileset Zeeland 2GB/tileset.json',
		}));
	}

	function addGeoTop() {
		tilesetGeoTop = viewer.scene.primitives.add(new Cesium.Cesium3DTileset({
			// url: 'data/GeoTOP Cesium Tileset allLayers NoordZeeland 4GB/tileset.json',
			// url: 'data/GeoTOP Cesium Tileset allLayers 2x2km Voxels/tileset.json',
			// url: 'data/GeoTOP Cesium Tileset allLayers Zeeland PointCloud/tileset.json',
			// url: 'data/GeoTOP Cesium Tileset topLayers Zeeland PointCloud/tileset.json',
			url: Cesium.IonResource.fromAssetId(902844), // pointcloud
			maximumScreenSpaceError: 1, //8192, //4096, //1,
		}));
		tilesetGeoTop.pointCloudShading.attenuation = true;
	}

	if (viewModel.showBHR) {
		addBHR();
	}
	if (viewModel.showGeoTop) {
		addGeoTop();
	}

	let inverseTransfromGeoTop;

	if (tilesetGeoTop) {
		tilesetGeoTop.readyPromise.then(function () {
			// zoom to center of tilesetGeoTop
			viewer.zoomTo(tilesetGeoTop, new Cesium.HeadingPitchRange(0.0, -0.5, tilesetGeoTop.boundingSphere.radius / 5));
			inverseTransfromGeoTop = Cesium.Matrix4.inverse(tilesetGeoTop.root.computedTransform, new Cesium.Matrix4());
		});
	}

	// viewer.scene.canvas.addEventListener('mousemove', debounce(mousemove, 200));
	viewer.scene.canvas.addEventListener('mousemove', mousemove);
	function mousemove(event) {
		if (!(viewModel.showGeoTop && viewModel.currentGeoTopVisualisation !== geoTopVisualisations.full && tilesetGeoTop && tilesetGeoTop.root)) {
			return;
		}
		let cartesianX;
		let cartesianY;
		if (viewModel.currentGeoTopVisualisation !== geoTopVisualisations.fixed) {
			cartesianX = event.clientX;
			cartesianY = event.clientY;
		} else {
			cartesianX = viewer.container.clientWidth / 2;
			cartesianY = viewer.container.clientHeight / 2;
		}
		const intersection = viewer.camera.pickEllipsoid(new Cesium.Cartesian2(cartesianX, cartesianY), ellipsoid);
		if (intersection) {
			const heading = viewer.camera.heading - Math.PI / 2;
			const down = new Cesium.Cartesian3(Math.cos(heading), -Math.sin(heading), 0);
			const right = new Cesium.Cartesian3(Math.sin(heading), -Math.cos(heading), 0);
			const up = Cesium.Cartesian3.negate(down, new Cesium.Cartesian3());
			const left = Cesium.Cartesian3.negate(right, new Cesium.Cartesian3());
			let earthPlanes;
			let geoTopPlanes;
			if (viewModel.currentGeoTopVisualisation === geoTopVisualisations.hole) {
				// gat
				earthPlanes = [
					new Cesium.ClippingPlane(down, -1500),
					new Cesium.ClippingPlane(left, -1500),
					new Cesium.ClippingPlane(up, -1500),
					new Cesium.ClippingPlane(right, -1500)
				];
				geoTopPlanes = [
					new Cesium.ClippingPlane(down, 1000),
					new Cesium.ClippingPlane(left, 1000),
					new Cesium.ClippingPlane(up, 1000),
					new Cesium.ClippingPlane(right, 1000)
				];
			} else {
				// ravijn
				earthPlanes = [
					new Cesium.ClippingPlane(down, 0)
				];
				geoTopPlanes = [
					new Cesium.ClippingPlane(down, 0),
					new Cesium.ClippingPlane(up, 100)
				];
			}
			const earthModelMatrix = Cesium.Transforms.eastNorthUpToFixedFrame(intersection, ellipsoid);
			const geoTopModelMatrix = Cesium.Matrix4.multiply(inverseTransfromGeoTop, earthModelMatrix, new Cesium.Matrix4());
			viewer.scene.globe.clippingPlanes = new Cesium.ClippingPlaneCollection({
				planes: earthPlanes,
				modelMatrix: earthModelMatrix,
			});
			tilesetGeoTop.clippingPlanes = new Cesium.ClippingPlaneCollection({
				planes: geoTopPlanes,
				unionClippingRegions: true,
				modelMatrix: geoTopModelMatrix,
			});
		}
	}
}());
