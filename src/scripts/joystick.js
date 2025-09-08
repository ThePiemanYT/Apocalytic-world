class Joystick {

    constructor(id, parent, padding) {
        this.padding = padding || 0.2 ;
    		this.x = 0.0 ;
        this.y = 0.0 ;
        this._panel = document.createElement("div")  ;
        this._panel.id = id || 'joystick' ;
        this._panel.classList.add("joystick-panel");
        this._thumb = document.createElement("div")  ;
        this._panel.appendChild(this._thumb);
        this._thumb.classList.add("joystick-thumb") ;
        (parent || document.body).append(this._panel);      
        
        this._thumb.addEventListener("touchstart", (e) => this.onTouchStart(e)) ;
        this._thumb.addEventListener("touchmove", (e) => this.onTouchMove(e)) ;
        this._thumb.addEventListener("touchend", (e) => this.onTouchEnd(e)) ;
        this._thumb.addEventListener("touchcancel", (e) => this.onTouchCancel(e)) ;

				this._thumb.addEventListener("mousedown", (e) => this.onTouchStart(e)) ;
        this._thumb.addEventListener("mousemove", (e) => this.onTouchMove(e)) ;
        this._thumb.addEventListener("mouseup", (e) => this.onTouchEnd(e)) ;
        
        this.resetThumb();
    }

    hide() {
        this._panel.style.display = "none" ;
    }

    show() {
        this._panel.style.display = "" ;
    }

    onTouchStart(e) {
        if(e.changedTouches) {
            this._touchIdentified = e.changedTouches.item(0).identifier ;
            this.handled(e);
        } else {
        	this._touchIdentified = -2 ; // mouse
        }
    }
    
    onTouchMove(e) {
        const touch = this.findTouch(e.changedTouches, this._touchIdentified, e) ;
        if(touch) {
            this.moveThumbTo(touch.pageX, touch.pageY);
            this.handled(e);
        }
    }

    onTouchEnd(e) {
        const touch = this.findTouch(e.changedTouches, this._touchIdentified, e) ;
        if(touch) {
            this._touchIdentified = -1 ;
            this.onTouchCancel(e);
        }
    }

    onTouchCancel(e) {
        this._touchIdentified = -1 ;
        this.x = 0.0 ;
        this.y = 0.0 ;
        this.resetThumb();
    }

    findTouch(touchList, identifier, e) {
    		if(identifier === -2) {
        		return { pageX : e.pageX, pageY : e.pageY } ;
        }
        if (touchList && identifier !== undefined) {
            for(let touch of touchList) {
                if(touch.identifier === identifier) {
                    return touch;
                }
            }    
        }
        return undefined;
    }

    moveThumbTo(pageX, pageY) {
        const panelRect = this._panel.getBoundingClientRect();
        const thumbRect = this._thumb.getBoundingClientRect();
        const panelWidth = panelRect.width;
        const panelHeight = panelRect.height;
        const thumbWidth = thumbRect.width;
        const thumbHeight = thumbRect.height;
        const halfThumbWidth = thumbWidth / 2;
        const halfThumbHeight = thumbHeight / 2;

        let left = pageX - panelRect.left - halfThumbWidth;
        let top = pageY - panelRect.top - halfThumbHeight;

        left = Math.max(-halfThumbWidth, Math.min(panelWidth - halfThumbWidth, left));
        top = Math.max(-halfThumbHeight, Math.min(panelHeight - halfThumbHeight, top));

        this._thumb.style.left = `${left}px`;
        this._thumb.style.top = `${top}px`;

        const px = panelWidth / 2.0;
        const py = panelHeight / 2.0;
        const x = Math.max(-1.0, Math.min(1.0, (left + halfThumbWidth - px) / (px / 2.0)));
        const y = -Math.max(-1.0, Math.min(1.0, (top + halfThumbHeight - py) / (py / 2.0)));

        this.x = Math.abs(x) < this.padding ? 0.0 : x;
        this.y = Math.abs(y) < this.padding ? 0.0 : y;
    }

		resetThumb() {
       const panelWidth = this._panel.clientWidth;
        const panelHeight = this._panel.clientHeight;
        const thumbWidth = this._thumb.clientWidth;
        const thumbHeight = this._thumb.clientHeight;

        this._thumb.style.left = `${(panelWidth - thumbWidth) / 2.0}px`;
        this._thumb.style.top = `${(panelHeight - thumbHeight) / 2.0}px`;
    }

    handled(e) {
        e.preventDefault();
        e.stopPropagation()
    }
}

var joystick1 = new Joystick('joystick1') ;
var joystick2 = new Joystick('joystick2') ;
setInterval(() => {
	document.getElementById('pos').innerText = `joystick1(${joystick1.x},${joystick1.y})\njoystick2(${joystick2.x},${joystick2.y})`
}, 100)