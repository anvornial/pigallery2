///<reference path="../../../browser.d.ts"/>

import {
    Component,
    Input,
    ElementRef,
    OnChanges,
    ViewChild,
    ViewChildren,
    QueryList,
    AfterViewInit,
    HostListener
} from "@angular/core";
import {Photo} from "../../../../common/entities/Photo";
import {GridRowBuilder} from "./GridRowBuilder";
import {GalleryLightboxComponent} from "../lightbox/lightbox.gallery.component";
import {GridPhoto} from "./GridPhoto";
import {GalleryPhotoComponent} from "./photo/photo.grid.gallery.component";
import {Config} from "../../config/Config";

@Component({
    selector: 'gallery-grid',
    templateUrl: 'app/gallery/grid/grid.gallery.component.html',
    styleUrls: ['app/gallery/grid/grid.gallery.component.css'],
    directives: [GalleryPhotoComponent]
})
export class GalleryGridComponent implements OnChanges,AfterViewInit {

    @ViewChild('gridContainer') gridContainer:ElementRef;
    @ViewChildren(GalleryPhotoComponent) gridPhotoQL:QueryList<GalleryPhotoComponent>;

    @Input() photos:Array<Photo>;
    @Input() lightbox:GalleryLightboxComponent;

    photosToRender:Array<GridPhoto> = [];

    private IMAGE_MARGIN = 2;
    private TARGET_COL_COUNT = 5;
    private MIN_ROW_COUNT = 2;
    private MAX_ROW_COUNT = 5;

    constructor() {
    }

    ngOnChanges() {
        if (this.isAfterViewInit === false) {
            return;
        }
        this.sortPhotos();
        this.mergeNewPhotos();
        setImmediate(() => {
            this.renderPhotos();
        });
    }

    @HostListener('window:resize')
    onResize() {
        if (this.isAfterViewInit === false) {
            return;
        }
        this.sortPhotos();
        this.clearRenderedPhotos();
        setImmediate(() => {
            this.renderPhotos();
        });
    }

    isAfterViewInit:boolean = false;

    ngAfterViewInit() {
        this.lightbox.gridPhotoQL = this.gridPhotoQL;

        //TODO: implement scroll detection


        this.sortPhotos();
        this.clearRenderedPhotos();
        setImmediate(() => {
            this.renderPhotos();
        });
        this.isAfterViewInit = true;
    }


    private sortPhotos() {
        //sort pohots by date
        this.photos.sort((a:Photo, b:Photo) => {
            if (a.metadata.creationDate > b.metadata.creationDate) {
                return 1;
            }
            if (a.metadata.creationDate < b.metadata.creationDate) {
                return -1;
            }
            // a must be equal to b
            return 0;
        });

    }

    private clearRenderedPhotos() {
        this.photosToRender = [];
        this.renderedPhotoIndex = 0;
    }

    private mergeNewPhotos() {
        //merge new data with old one
        let lastSameIndex = 0;
        let lastRowId = null;
        for (let i = 0; i < this.photos.length && i < this.photosToRender.length; i++) {

            //thIf a photo changed the whole row has to be removed
            if (this.photosToRender[i].rowId != lastRowId) {
                lastSameIndex = i;
                lastRowId = this.photosToRender[i].rowId;
            }
            if (this.photosToRender[i].equals(this.photos[i]) === false) {
                break;
            }
        }

        if (lastSameIndex > 0) {
            this.photosToRender.splice(lastSameIndex, this.photosToRender.length - lastSameIndex);
            this.renderedPhotoIndex = lastSameIndex;
        } else {
            this.clearRenderedPhotos();
        }
    }


    private renderedPhotoIndex:number = 0;

    private renderPhotos() {
        if (this.getContainerWidth() == 0 || this.renderedPhotoIndex >= this.photos.length || !this.shouldRenderMore()) {
            return;
        }

        let maxRowHeight = window.innerHeight / this.MIN_ROW_COUNT;
        let minRowHeight = window.innerHeight / this.MAX_ROW_COUNT;

        let renderedContentHeight = 0;

        while (this.renderedPhotoIndex < this.photos.length && this.shouldRenderMore(renderedContentHeight) === true) {

            let photoRowBuilder = new GridRowBuilder(this.photos, this.renderedPhotoIndex, this.IMAGE_MARGIN, this.getContainerWidth());
            photoRowBuilder.addPhotos(this.TARGET_COL_COUNT);
            photoRowBuilder.adjustRowHeightBetween(minRowHeight, maxRowHeight);

            let rowHeight = photoRowBuilder.calcRowHeight();
            let imageHeight = rowHeight - (this.IMAGE_MARGIN * 2);

            photoRowBuilder.getPhotoRow().forEach((photo) => {
                let imageWidth = imageHeight * (photo.metadata.size.width / photo.metadata.size.height);
                this.photosToRender.push(new GridPhoto(photo, imageWidth, imageHeight, this.renderedPhotoIndex));
            });

            renderedContentHeight += rowHeight;
            this.renderedPhotoIndex += photoRowBuilder.getPhotoRow().length;

        }
    }


    /**
     * Returns true, if scroll is >= 70% to render more images.
     * Or of onscroll renderin is off: return always to render all the images at once
     * @param offset Add height to the client height (conent is not yet added to the dom, but calculate with it)
     * @returns {boolean}
     */
    private shouldRenderMore(offset:number = 0):boolean {
        return Config.Client.enableOnScrollRendering === false ||
            document.body.scrollTop >= (document.body.clientHeight + offset - window.innerHeight) * 0.7
            || (document.body.clientHeight + offset) * 0.85 < window.innerHeight;

    }

    @HostListener('window:scroll')
    onScroll() {
        this.renderPhotos();

        if (Config.Client.enableOnScrollThumbnailPrioritising === true) {
            this.gridPhotoQL.toArray().forEach((pc:GalleryPhotoComponent) => {
                pc.onScroll();
            });
        }
    }

    private getContainerWidth():number {
        if (!this.gridContainer) {
            return 0;
        }
        return this.gridContainer.nativeElement.clientWidth;
    }


}



