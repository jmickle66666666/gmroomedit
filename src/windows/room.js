(function() {
    let Room = {};
    let open = false;
    let roomData = null;
    let roomPath = null;
    let tilesetData = null;

    let rv = document.querySelector("div.wb#roomViewer");

    let roomLayers = [];

    function drawTile(src, dest, index, x, y, tileWidth, tileHeight)
    {
        // the transforms aren't working

        // let mirrored = index & (1 << 28) != 0;
        // let flipped = index & (1 << 29) != 0;
        // let rotated = index & (1 << 30) != 0;
        index &= 262143;
        let ix = index % (src.width/tileWidth);
        let iy = Math.floor(index / (src.width/tileWidth));
        let sx = ix * tileWidth;
        dest.drawImage(src, sx, iy * tileHeight, tileWidth, tileHeight, x * tileWidth, y * tileHeight, tileWidth, tileHeight);
    }

    function drawLayer(ctx, layer) {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        if (layer["$GMRTileLayer"] != null) {
            let newTileArray = [layer.tiles.SerialiseWidth * layer.tiles.SerialiseHeight,];
            GMF.getAssetData(layer.tilesetId.name, (tileset_data) => {
                tilesetData = tileset_data;
                GMF.getObjectSprite(layer.tilesetId.name, (sprite_data) => {
                    Util.loadImage(sprite_data.img_path, (tileset_image) => {
                        ctx.canvas.tileset_image = tileset_image;
                        let tiles = layer.tiles["TileCompressedData"];

                        let pos = 0;
                        let x = 0;
                        let y = 0;
                        while (pos < tiles.length) {
                            if (tiles[pos] < 0) {
                                let rep = tiles[pos] * -1;
                                pos += 1;
                                for (let n = 0; n < rep; n++) {
                                    drawTile(tileset_image, ctx, tiles[pos], x, y, tileset_data.tileWidth, tileset_data.tileHeight);
                                    newTileArray.push(tiles[pos]);
                                    x += 1;
                                    if (x >= layer.tiles.SerialiseWidth) {
                                        x = 0;
                                        y += 1;
                                    }
                                }
                                pos += 1;
                            } else {
                                let rep = tiles[pos];
                                pos += 1;
                                for (let n = 0; n < rep; n++) {
                                    drawTile(tileset_image, ctx, tiles[pos], x, y, tileset_data.tileWidth, tileset_data.tileHeight);
                                    newTileArray.push(tiles[pos]);
                                    pos += 1;
                                    x += 1;
                                    if (x >= layer.tiles.SerialiseWidth) {
                                        x = 0;
                                        y += 1;
                                    }
                                }
                            }
                        }
                        layer.tiles["TileCompressedData"] = newTileArray;
                    })
                });
            });
        }

        if (layer["$GMRInstanceLayer"] != null) {
            let instances = layer.instances;
            for (let inst of instances) {
                GMF.getObjectSprite(inst.objectId.name, (sprite_data) => {
                    Util.loadImage(sprite_data.img_path, (img) => {
                        ctx.drawImage(img, inst.x - sprite_data.data.sequence.xorigin, inst.y - sprite_data.data.sequence.yorigin);
                    })
                });
            }
        }

        if (layer["$GMRBackgroundLayer"] != null) {
            ctx.fillStyle = Util.abgrToRGBA(layer.colour);
            ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        }
    }

    function updateTileLayer(ctx, layer) {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        let tileset_data = tilesetData;
        let tileset_image = ctx.canvas.tileset_image;
        let tiles = layer.tiles["TileCompressedData"];

        let pos = 0;
        let x = 0;
        let y = 0;
        while (pos < tiles.length) {
            if (tiles[pos] < 0) {
                let rep = tiles[pos] * -1;
                pos += 1;
                for (let n = 0; n < rep; n++) {
                    drawTile(tileset_image, ctx, tiles[pos], x, y, tileset_data.tileWidth, tileset_data.tileHeight);
                    x += 1;
                    if (x >= layer.tiles.SerialiseWidth) {
                        x = 0;
                        y += 1;
                    }
                }
                pos += 1;
            } else {
                let rep = tiles[pos];
                pos += 1;
                for (let n = 0; n < rep; n++) {
                    drawTile(tileset_image, ctx, tiles[pos], x, y, tileset_data.tileWidth, tileset_data.tileHeight);
                    pos += 1;
                    x += 1;
                    if (x >= layer.tiles.SerialiseWidth) {
                        x = 0;
                        y += 1;
                    }
                }
            }
        }
    }

    function renderRoom(_roomData) {
        TilePicker.clear();
        dx = 0;
        dy = 0;
        roomData = _roomData;
        let canvas = document.createElement("canvas");
        let ctx = canvas.getContext("2d");
        
        let layers = roomData.layers;
        
        canvas.width = roomData.roomSettings.Width;
        canvas.height = roomData.roomSettings.Height;

        rv.innerHTML = "";
        roomLayers = [];
        for (let i = 0; i < layers.length; i++)
        {
            let cnv = document.createElement("canvas");
            cnv.width = canvas.width;
            cnv.height = canvas.height;
            let _ctx = cnv.getContext("2d");
            drawLayer(_ctx, layers[i]);
            cnv.style.position = "absolute";
            cnv.style.width = (canvas.width).toString()+"px";
            cnv.layer = layers[i];
            roomLayers.push(cnv);
        }
        
        roomLayers.sort((a, b) => b.layer.depth - a.layer.depth);
        
        for (let i = 0; i < roomLayers.length; i++)
        {
            rv.appendChild(roomLayers[i]);
        }

        openWindow(canvas.width, canvas.height);

        let rect = rv.getBoundingClientRect();
        if (Settings.loadValue("mousefix", false)) {
            moveView((rect.width/zoom - canvas.width*zoom)/2, (rect.height/zoom - canvas.height*zoom)/2);
        } else {
            moveView((rect.width - canvas.width*zoom)/2, (rect.height - canvas.height*zoom)/2);
        }
    }
    Room.renderRoom = renderRoom;

    function updateVisibility() {
        for (let i = 0; i < roomLayers.length; i++) {
            roomLayers[i].style.visibility = roomLayers[i].layer.visible?"visible":"hidden";
        }
    }
    Room.updateVisibility = updateVisibility;

    function openWindow(w, h) {
        if (open) return;
        open = true;
        let size = Settings.getWindowSize("room", 10, 10, 400, 300);
        winbox = new WinBox("Room Viewer", {
            mount: document.querySelector("div.wb#roomViewer"),
            onclose: () => {
                open = false;
            },
            x:size.x,
            y:size.y,
            width:size.w,
            height:size.h,
            bottom:"2px",
            onresize: (w, h) => {
                Settings.saveWindowWH("room", w, h)
            },
            onmove: (x, y) => {
                Settings.saveWindowXY("room", x, y)
            }
        });
    }

    let dragging = false;
    let dx = 0;
    let dy = 0;
    let mx = 0;
    let my = 0;
    let holding = false;
    rv.addEventListener("mousedown", (e) => {
        if (e.button == 1) {
            dragging = true;
        }

        if (e.button == 0) {
            holding = true;
            if (Layers.currentLayer != null && Layers.currentLayer["$GMRTileLayer"] != null) {
                paintTile();
            }
        }

        if (e.button == 2) {
            if (Layers.currentLayer != null && Layers.currentLayer["$GMRTileLayer"] != null) {
                deleteTile();
            }
        }
    });

    let lastdrawpos = {x:-1, y:-1};
    function paintTile() {
        let x = Math.floor(((mx-dx*zoom) / tilesetData.tileWidth)/zoom);
        let y = Math.floor(((my-dy*zoom) / tilesetData.tileHeight)/zoom);
        if (x == lastdrawpos.x && y == lastdrawpos.y) return;
        lastdrawpos.x = x;
        lastdrawpos.y = y;
        let index = x + y * Layers.currentLayer.tiles.SerialiseWidth;
        index += 1;
        let newTile = TilePicker.getCurrentTile();
        if (newTile != -1) {
            Layers.currentLayer.tiles["TileCompressedData"][index] = newTile;
            
            for (let i = 0; i < roomLayers.length; i++) {
                if (roomLayers[i].layer == Layers.currentLayer) {
                    drawTile(roomLayers[i].tileset_image, roomLayers[i].getContext("2d"), newTile, x, y, tilesetData.tileWidth, tilesetData.tileHeight);
                    break;
                }
            }
        }
    }

    function deleteTile() {
        let x = Math.floor(((mx-dx*zoom) / tilesetData.tileWidth)/zoom);
        let y = Math.floor(((my-dy*zoom) / tilesetData.tileHeight)/zoom);
        let index = x + y * Layers.currentLayer.tiles.SerialiseWidth;
        index += 1;
        Layers.currentLayer.tiles["TileCompressedData"][index] = 0;
        for (let i = 0; i < roomLayers.length; i++) {
            if (roomLayers[i].layer == Layers.currentLayer) {
                roomLayers[i].getContext("2d").clearRect(x * tilesetData.tileWidth, y * tilesetData.tileHeight, tilesetData.tileWidth, tilesetData.tileWidth);
                break;
            }
        }
    }

    window.addEventListener("keydown", (e) => {
        if(e.ctrlKey && e.key == "s") {
            log("Saving room!");
            let path = GMF.getRoomDataPath(roomData["%Name"]);
            Engine.fileWriteText(path, JSON.stringify(roomData));
        }
    })

    window.addEventListener("mouseup", (e) => {
        if (e.button == 1) {
            dragging = false;
        }

        if (e.button == 0) {
            holding = false;
        }
    });

    function moveView(x, y) {
        dx += x/zoom;
        dy += y/zoom;
        for (let i = 0; i < roomLayers.length; i++) {
            roomLayers[i].style.left = `${dx}px`;
            roomLayers[i].style.top = `${dy}px`;
        }
    }

    function moveViewTo(x, y) {
        dx = x/zoom;
        dy = y/zoom;
        for (let i = 0; i < roomLayers.length; i++) {
            roomLayers[i].style.left = `${dx}px`;
            roomLayers[i].style.top = `${dy}px`;
        }
    }

    window.addEventListener("mousemove", (e) => {
        if (dragging) {
            moveView(e.movementX, e.movementY);
        }

        if (holding) {
            if (Layers.currentLayer != null && Layers.currentLayer["$GMRTileLayer"] != null) {
                paintTile();
            }
        }
    });

    rv.addEventListener("mousemove", (e) => {
        let r = rv.getBoundingClientRect();
        mx = e.pageX - r.x;
        my = e.pageY - r.y;

        if (Settings.loadValue("mousefix", false)) {
            mx = e.pageX - r.x*zoom;
            my = e.pageY - r.y*zoom;
        }
    });

    let zoom = 1.0;
    rv.addEventListener("wheel", (e) => {
        let oldZoom = zoom;
        if (e.deltaY < 0) zoom *= 1.2;
        if (e.deltaY > 0) zoom /= 1.2;

        let zoomDiff = zoom-oldZoom;

        moveView((-mx/oldZoom) * zoomDiff, (-my/oldZoom) * zoomDiff);

        rv.style.zoom = `${zoom*100}%`;
    });

    window.Room = Room;
})();