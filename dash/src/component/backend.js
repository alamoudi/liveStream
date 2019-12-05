import * as request from 'request';


export class Request {
    constructor(shim) {
        this._shim = shim;
        this._json = {
            'pieceRequest' : false,
        };
        this._callback = (body) => {};
        this._error = () => {};
    }

    addStats(stats) {
        this._json['stats'] = stats;
        return this;
    }

    addPieceRequest() {
        this._json['pieceRequest'] = true;
        return this;
    }

    send() {
        console.log(`[BackendShim] sending request`)
        console.log(this._json)
        request.post(this._shim.path, {
            json : this._json,
        }, (error, res, body) => {
            if (error) {
                console.log(`[BackendShim] ${error}`);
                this._error();
                return
            }
            let statusCode = res.statusCode;
            if (statusCode != 200) {
                console.log(`[BackendShim] status code ${statusCode}`);
                console.log(res);
                console.log(body);
                this._error();
                return
            }
            console.log(`[BackendShim] successful request`);
            console.log(body);
            this._callback(body);
        })
        return this;
    }

    onFail(callback) {
        this._error = callback;
        return this;
    }

    onSuccess(callback) {
        this._callback = callback;
        return this;
    }
}


export class BackendShim {
    constructor() {
        this._path = "https://www.example.org/request";
    }

    request() {
        return new Request(this);
    }

    get path() {
        return this._path;
    }
}