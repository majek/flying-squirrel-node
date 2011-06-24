exports.random_string = function(bits) {
    var c = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    var ret = [];
    while(bits > 0) {
        var rand = Math.floor(Math.random()*0x100000000);
        var i;
        for(i=26; i>0 && bits>0; i-=6, bits-=6)
            ret.push( c[0x3F & rand >>> i] );
    }
    return ret.join('');
};
