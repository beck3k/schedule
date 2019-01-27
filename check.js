function adjustElement(element, json){
    if(json['msg'] == undefined || json['msg'] == ""){
    }else{
        $(element).find('.msg').text(json['msg']);
    }
    $(element).addClass('active');
}

function setStatus(){
    $('div.card').removeClass('active');

    fetch(`status.json?${new Date().getTime()}`).then((response) => {
        response.body.getReader().read().then((text) => {
            var raw = new TextDecoder('utf-8').decode(text.value);
            var json = JSON.parse(raw);
            console.log(json['status']);
            switch(json['status']) {
            case 'available':
                adjustElement('#available', json);
                break;
            case 'moment':
                adjustElement('#moment', json);
                break;
            case 'no':
                adjustElement('#no', json);
                break;
            default:
                break;
            };
        });
    });
}

$(document).ready(() => {
    setStatus();
});
