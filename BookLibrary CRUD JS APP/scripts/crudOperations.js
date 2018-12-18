const BASE_URL = 'https://baas.kinvey.com/';
const APP_KEY = 'kid_SJ1LfsTH7';
const APP_SECRET = '23cea7f94f8743bfafe59aae07006a29';
const AUTH_HEADERS = {
    'Authorization': "Basic " + btoa(APP_KEY + ":" + APP_SECRET),
    'Content-Type': 'application/json'
};
const BOOKS_PER_PAGE = 10;

function request(method, endPoint, data) {
    return $.ajax({
        method: method,
        url: BASE_URL + endPoint,
        headers: AUTH_HEADERS,
        data: JSON.stringify(data)
    })
}

function loginUser() {
    // POST -> BASE_URL + 'user/' + APP_KEY + '/login'
    // signInUser(res, 'Login successful.')

    let userName = $('#formLogin input[name="username"]').val();
    let password = $('#formLogin input[name="passwd"]').val();
    let credentials = {
        username: userName,
        password: password
    };
    request('Post', `user/${APP_KEY}/login`, credentials)
        .then((res) => {
            signInUser(res, 'Login successful.')
        })
        .catch(handleAjaxError);
}

function logoutUser() {
    $.ajax({
        method: 'Post',
        url: BASE_URL + `user/${APP_KEY}/_logout`,
        headers: {
            'Authorization': `Kinvey ${sessionStorage.getItem('authToken')}`
        }
    }).then((result) => {
        console.log(result);
    }).catch(handleAjaxError)
    sessionStorage.clear();
    showHideMenuLinks();
    showHomeView();
    showInfo('Logout successful.');
    $('#loggedInUser').empty();

    // showInfo('Logout successful.')
}

function registerUser() {
    // POST -> BASE_URL + 'user/' + APP_KEY + '/'
    // signInUser(res, 'Registration successful.')

    let userName = $('#formRegister input[name="username"]').val();
    let password = $('#formRegister input[name="passwd"]').val();
    let credentials = {
        username: userName,
        password: password
    };
    request('Post', `user/${APP_KEY}/`, credentials)
        .then((result) => {
            console.log(result)
            signInUser(result, 'Registration successful.')
        })
        .catch(handleAjaxError);
}

function listBooks() {
    $.ajax({
        method: 'Get',
        url: BASE_URL + `appdata/${APP_KEY}/books`,
        headers: {'Authorization': `Kinvey ${sessionStorage.getItem('authToken')}`}
    })
        .then((result) => {
            displayPaginationAndBooks(result)
        })
        .catch(handleAjaxError)

    // GET -> BASE_URL + 'appdata/' + APP_KEY + '/books'
    // displayPaginationAndBooks(res.reverse())
}


function createBook()   {
    // POST -> BASE_URL + 'appdata/' + APP_KEY + '/books'
    // showInfo('Book created.')
    let formCreate = $('#formCreateBook');
    let title = formCreate.find($('input[name=title]')).val();
    let author = formCreate.find($('input[name=author]')).val();
    let description = formCreate.find($('textarea[name=description]')).val();

    let newBook = {title, author, description};
    formCreate.on('submit', function () {
        $.ajax({
            method: 'Post',
            url: `${BASE_URL}appdata/${APP_KEY}/books`,
            headers: {
                'Authorization': `Kinvey ${sessionStorage.getItem('authToken')}`,
                'Content-Type': 'application/json'
            },
            data: JSON.stringify(newBook)
        }).then((result) => {
            listBooks();
            showInfo('Book created');
        }).catch(handleAjaxError)

    })
}

function deleteBook(book) {
    // DELETE -> BASE_URL + 'appdata/' + APP_KEY + '/books/' + book._id
    // showInfo('Book deleted.')
    $.ajax({
        method: 'Delete',
        url: BASE_URL + 'appdata/' + APP_KEY + '/books/' + book._id,
        headers: {
            'Authorization': `Kinvey ${sessionStorage.getItem('authToken')}`,
            'Content-Type': 'application/json'
        },
    }).then((result) => {
        listBooks();
        showInfo('Book deleted.')
    }).catch(handleAjaxError)
}

function loadBookForEdit(book) {
    showView('viewEditBook');
    let formEditBook = $('#formEditBook');
    let currentId = formEditBook.find($('input[name=id]')).val(book._id);
    formEditBook.find($('input[name=title]')).val(book.title);
    formEditBook.find($('input[name=author]')).val(book.author);
    formEditBook.find($('textarea[name=description]')).val(book.description);
}

function editBook() {
    // PUT -> BASE_URL + 'appdata/' + APP_KEY + '/books/' + book._id
    // showInfo('Book edited.')
    let formEditBook = $('#formEditBook');
    let currentId = formEditBook.find($('input[name=id]')).val();

    let editedBook = {
        title: formEditBook.find($('input[name=title]')).val(),
        author: formEditBook.find($('input[name=author]')).val(),
        description: formEditBook.find($('textarea[name=description]')).val()
    }
    $.ajax({
        method: 'Put',
        url: BASE_URL + 'appdata/' + APP_KEY + '/books/' + currentId,
        headers: {
            'Authorization': `Kinvey ${sessionStorage.getItem('authToken')}`,
            'Content-Type': 'application/json'
        },
        data: JSON.stringify(editedBook)
    }).then((result) => {
        listBooks();
        showInfo('Book edited.')
    }).catch(handleAjaxError)
}

function saveAuthInSession(userInfo) {
    sessionStorage.setItem('authToken', userInfo._kmd.authtoken);
    sessionStorage.setItem('username', userInfo.username);
    sessionStorage.setItem('userId', userInfo._id);
}

function signInUser(result, message) {
    saveAuthInSession(result);
    showHideMenuLinks();
    showHomeView();
    showInfo(message);
}

function displayPaginationAndBooks(books) {
    showView('viewBooks');
    let pagination = $('#pagination-demo')
    if (pagination.data("twbs-pagination")) {
        pagination.twbsPagination('destroy')
    }
    pagination.twbsPagination({
        totalPages: Math.ceil(books.length / BOOKS_PER_PAGE),
        visiblePages: 5,
        next: 'Next',
        prev: 'Prev',

        onPageClick: function (event, page) {
            $('#books > table tr').each((index, element) => {
                if (index > 0) {
                    $(element).remove();
                }
            });

            let startBook = (page - 1) * BOOKS_PER_PAGE
            let endBook = Math.min(startBook + BOOKS_PER_PAGE, books.length)
            $(`a:contains(${page})`).addClass('active')

            //loading all books
            for (let i = startBook; i < endBook; i++) {
                let tr = $(`<tr><td>${books[i].title}</td>` +
                    `<td>${books[i].author}</td>` +
                    `<td>${books[i].description}</td>`);
                $('#books > table').append(tr);

                //important - adding edit and delete only to the current user books
                if (books[i]._acl.creator === sessionStorage.getItem('userId')) {
                    let td = $('<td>');
                    let editLink = $('<a href="#">[Edit]</a>')
                        .on('click', function () {
                            loadBookForEdit(books[i])
                        });

                    let delLink = $('<a href="#">[Delete]</a>')
                        .on('click', function () {
                            deleteBook(books[i])
                        });

                    td.append(editLink).append(delLink);
                    tr.append(td);
                }
            }
        }
    })
}

function handleAjaxError(response) {
    let errorMsg = JSON.stringify(response)
    if (response.readyState === 0)
        errorMsg = "Cannot connect due to network error."
    if (response.responseJSON && response.responseJSON.description)
        errorMsg = response.responseJSON.description
    showError(errorMsg)
}