import WorldWind from '@nasaworldwind/worldwind'

// Create a WorldWindow for the canvas.
const wwd = new WorldWind.WorldWindow("worldwind-canvas")

// Add a low resolution base world map from Blue Marble imagery
wwd.addLayer(new WorldWind.BMNGOneImageLayer())
// Make the base layer appear lighter coloured to emphasize the snow data.
wwd.layers[0].renderables.forEach(r => { r.opacity = 0.6 })

WorldWind.Logger.setLoggingLevel(WorldWind.Logger.LEVEL_WARNING);

// Show the approximate center of the snow meltoff maps.
wwd.goTo(new WorldWind.Position(57, 19, 5000000))

// Geographic extent of the snow cover maps below.
const bbox = new WorldWind.Sector(35, 72, -11, 50)


// Like python range(start, end)
const range = (start, end) => [...Array(end - start).keys()].map(x => x + start)
const years = range(2001, 2016 + 1)


// NB: We display low/medium sized PNG files instead of GeoTIFF or other
// formats because WorldWind GeoTIFF parsing is limited, slow, and buggy.

// Map files are transformed from original 1-bit GeoTIFF files as follows:
// - Project data to WorldWind native EPSG:4087 format
//       gdalwarp -dstalpha -r lanczos -t_srs EPSG:4087 map.tif map_epsg4087.tif
// - Decrease resolution 10x to 1220x740
//       gdal_translate -ot Byte -b 1 -r lanczos -outsize 1220 740 map_epsg4087.tif map_epsg4087_tenth.tif
// - Convert black pixels to transparent:
//       convert map_epsg4087_tenth.tif -transparent black map_epsg4087_tenth.png
// - Increase contrast/brightness in the very gray resulting map with ImageMagick:
//       convert map_epsg4087_tenth.png -brightness-contrast 70 map_epsg4087_tenth_w1.png
// - Fix transparency in the resulting image:
//       convert map_epsg4087_tenth_w1.png -transparent '#B3B3B3B3' map_epsg4087_tenth_w2.png
//
const urls = years.map(year => `map/meltoff_${year}_epsg4087_tenth_w2.png`)

// Create a layer for each map with a single SurfaceImage each from the map image URL
const layers = years.map(year => new WorldWind.RenderableLayer(`Snow Meltoff on ${year}`))
const surfaces = urls.map(url => new WorldWind.SurfaceImage(bbox, url))

// Hide (disable) each layer and add them to WorldWind context.
layers.forEach((layer, i) => {
  layer.enabled = false
  layer.addRenderable(surfaces[i])
  wwd.addLayer(layer)
})

const numMaps = years.length
let paused = false
let currentMapIndex = -1
function showNextMap(offset=1) {
  if (paused) return

  // Ensure currentMapIndex is in range [0, number of images)
  // JS % semantics can otherwise result in negative numbers.
  const prevIdx = (currentMapIndex + numMaps) % numMaps
  currentMapIndex = (currentMapIndex + numMaps + offset) % numMaps

  const idx = currentMapIndex % numMaps
  layers[prevIdx].enabled = false
  layers[idx].enabled = true

  document.getElementById('output').textContent = `Snow Cover in ${years[idx]}`
  wwd.redraw()
}

window.showPrevious = () => showNextMap(-1)
window.showNext = () => showNextMap(+1)
window.togglePlayback = () => { paused = !paused }

window.clearInterval(window.int) // Hot reload

// "The main loop": Rotate maps every 0.5 seconds while playback is enabled.
window.int = window.setInterval(showNext, 500)
