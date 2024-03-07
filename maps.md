# usda-slippy-map

## Requirements
- [OpenTileMap CLI](https://github.com/openmaptiles/openmaptiles)
- [Maputnik CLI](https://github.com/maplibre/maputnik)
- Probably QGIS3

## Table of Contents


## Rough road map

Trying to follow this: https://www.kschaul.com/post/2023/02/16/how-the-post-is-replacing-mapbox-with-open-source-solutions/

### Todays work
- figure out how to bake the OSM data with custom vector data (finish [this](https://github.com/maptiler/foss4g-workshop?tab=readme-ov-file) tutorial )
- talk over with aly
### Mysteries, as of yet
Basemap
- how big is the basemap in GB? ''
Raster 
- do we even need rasters? Is it possible to create a very very detailed geojson (since it's served as vector tiles)
	- do we have computing power to actually do this transform
		- Could split raster into pieces for RAKM reasons
	- How large would the subsequent file be?
- If not, how to tile-ize rasters (should be existing tech here, i.e. easier) 
- how to serve rasters tiles
- is it possible to serve rasters sandwiched between vector tiles under (borders/lakes), above place labels 
Tooltips
- Where do tooltip data come from? The vector tiles or elsewhere? Probably a maplibre question
Should we include Hawaii and Alaska?
- If so, how are they navigated to in the map? Are we using `900913` mercator? Or other (possible with openmaptile!)
- If so, they will have *more* complicated data...how caveat that 
### To do

Data
- Pre-process 2012 and 2023 data
- Min temp data ?
- Any other data? 

Back end
- Get USA (and alaska/hawaii?) data and build vector tiles
- Tile rasters OR convert to vectors
- style a simple NPR basement
	- learn [style.json syntax](https://docs.mapbox.com/style-spec/guides/) 
	- decide what items are needed
		- state borders
		- oceans
		- major lakes
		- (major?) rivers
		- place names
		- any terrain? 
  - Convert tiles/send tiles to PMTiles
	  - some sort of AWS voodoo

Front end
- Investigate geolocating options
- figure out maplibre GL JS
- figure out tooltips

Design
- all of it

Writing the story
- all of it

Illustrations? 
- all of it

## Flowchart 
```mermaid
graph LR
subgraph "`**key**`"
	A[data]:::data
	B[unsure]:::unsure
	C([output]):::output
	D[(database)]
	E(process):::process
end

classDef data fill:#00ff00aa
classDef unsure stroke-dasharray: 5 5
classDef output fill:#00ffddaa
classDef process fill: #ff00ffaa, color: #fff
classDef unsureprocess fill: #ff00ffaa, color: #fff, stroke-dasharray: 5 5

```

```mermaid
graph TB
W[custom rasters]:::data --> WW[some raster tiling process]:::unsureprocess -. custom Raster tiles:::data .-> Y[(raster hosting?)]:::unsure 

B[custom vectors]:::data --> ogr2ogr:::process --> postgisDB
B[custom vectors] --> E
Z3[other data?]:::data -.-> G
E["`**maputnik** 
	vector tile styling`"]:::toLearn -. "??" .-> D


A[OSM, NE, etc.]:::data -->C(make process):::process
A --> E

subgraph "`**OpenMapTiles**`"
C --> postgisDB[(postgisDB)] -->|.MBtiles | D[?? bake it all ??]:::unsure

end

E -. "style.json"  .-> G


D -. MVT tiles? .-> F[("`**PMTiles** 
		vector tile hosting`")]:::unsure
F --> G["`**maplibre-gl-js** for client-side`"]

Y .-> G

subgraph "`**browser**`"
G --> Z([Tooltips]):::output
G --> Z2([Map]):::output
end
classDef data fill:#00ff00aa
classDef unsure stroke-dasharray: 5 5
classDef output fill:#00ffddaa
classDef process fill: #ff00ffaa, color: #fff
classDef unsureprocess fill: #ff00ffaa, color: #fff, stroke-dasharray: 5 5, stroke: #000
```

## Learn More
### OpenTileMap
- https://github.com/maptiler/foss4g-workshop?tab=readme-ov-file
- https://www.youtube.com/watch?v=mx9l_yn8Dc0&list=PLGHe6Moaz52Mcq4BC9vczIIizNzwIYocv&index=2&ab_channel=MapTiler

### Maputnik
- https://github.com/maplibre/maputnik/wiki/Style-GeoJSON-Files
- style spec: https://docs.mapbox.com/style-spec/guides/
- You may need a maptiler (free) account and API key to use this locally...this is poorly documented: https://cloud.maptiler.com/account/keys/
- You can also use the [web editor](https://maplibre.org/maputnik/?layer=2134303678%7E0#0.49/0/0) but then you can't easily integrate with this repo. 

### How to get Geojsons into postgis/openmaptiles
- https://www.youtube.com/watch?v=3xpTBJAL8nc&list=PLGHe6Moaz52Mcq4BC9vczIIizNzwIYocv&index=4&ab_channel=MapTiler (ogr2ogr)
### Maplibre 
- https://github.com/stlpublicradio/dailygraphics-templates/tree/master/interactive_polygon_map
### Other helpful links
https://discussions.apple.com/docs/DOC-250006086

https://github.com/maplibre/maputnik/issues/215

https://openmaptiles.org/docs/generate/custom-vector-from-shapefile-geojson/