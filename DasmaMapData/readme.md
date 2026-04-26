## Usage

To split up a geojson file into LineStrings, Points, and Polygons, just cd to this folder and run `node splitGeojson.js <file.geojson>`. This will return the files:

1. Dasma_LineStrings.geojson
2. Dasma_Points.geojson
3. Dasma_Polygons.geojson

## Existing Files

1. **Dasma_LineStrings-AllRoads.geojson**
    - Originally Dasma_LineStrings.geojson output from the script file. Roads outside Dasmarinas were deleted.

2. **Dasma_LineStrings-PublicRoads.geojson**
    - Dasma_LineStrings.geojson but modified to only have roads assumed to be public or accessible to PUJ. Roads not deemed to be public were deleted.

3. **Dasma_LineStrings-WebModified.geojson**
    - Dasma_LineStrings.geojson but modified via the JeepLink admin dashboard before the usage of QGIS software, which is a faster way of disabling certain roads. Just here as a backup.

4. **Dasma_LineStrings.geojson, Dasma_Points.geojson, and Dasma_Polygons.geojson**
    - Original output from the script file.

5. **dasmarinas-260216_roads_v2.geojson**
    - Geojson file which only has data retained by transforming using Osmium. Original geojson file of the entirety of the Philippines is obtained from [GeoFabrik](https://download.geofabrik.de/asia/philippines.html).
