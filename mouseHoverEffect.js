window.addEventListener("mousemove", function (e) {
    var container = document.getElementById('loader-container');
    var to_append = container.getElementsByClassName('loader-container')[0];

    var parent_div = document.createElement('div');
    parent_div.className = "loader-container";
    var inner_div = document.createElement('div');
    inner_div.className = "loader";
    parent_div.appendChild(inner_div)
    var d = container.appendChild(parent_div);

    parent_div.style.zIndex = '1';
    parent_div.style.left = (e.clientX - 50)+'px';
    parent_div.style.top = (e.clientY - 50)+'px';

    if(container.getElementsByClassName('loader-container').length > 50) {
        container.removeChild(to_append)
    }
});
