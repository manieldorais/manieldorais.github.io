const pageload = (page)=>{
    $("#DivConteudo").load('pages/'+page+'.html');
};
$('a').on('click',(event)=>{
    const element = event.target;
    if(element.getAttribute('content-load')){
        pageload(element.getAttribute('content-load'));
    }
});