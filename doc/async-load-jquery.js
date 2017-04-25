/*console 控制台加载jquery 代码*/

function LoadJS( id, fileUrl ) {
    var scriptTag = document.getElementById( id );

    var oHead = document.getElementsByTagName('HEAD').item(0);

    var oScript= document.createElement("script");

    if ( scriptTag  ) oHead.removeChild( scriptTag  );

    oScript.id = id;

    oScript.type = "text/javascript";

    oScript.src=fileUrl ;

    oHead.appendChild( oScript);
}



LoadJS('jquery' ,"http://cdn.bootcss.com/jquery/1.11.1-rc1/jquery.js" );