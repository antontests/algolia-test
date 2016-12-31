# Algolia Test Task
This is my implementation of the test task. Let me explain a little bit what it does and why.

## Features
1. **App Store search** with auto-completion and categories filtering. It's the homepage. The search can be bound to the chosen category (I didn't do the multi-choice of the categories and the numbers of items found in the categories to simplify the UI, but it's possible to make these amendments as well).
2. **API for creating and deleting the objects in the index**. The given URIs, `/api/1/apps` (POST) and `/api/1/apps/:id` (DELETE), let you perform the create and delete operations respectively, as requested. They also do some pre-validation of the requests they get in order to save the requests to the Algolia API (as these requests aren't free of charge) and to avoid the response code 500 that nobody likes to get :)
3. **Simple API test pages**. To quickly test the API for creation and deletion of the index objects there are two more URIs — `/test_create/` and `/test_delete/`. They send the requests to the API with PHP CURL and display the content of the response and the `curl_getinfo()` after the execution of the request.

## Infrastructure
### Server
The combination the whole thing works with here — http://algolia-test.anton-kazakov.ru — is Nginx+PHP-FPM (PHP 7.0) with the gzip compression.
### Back-end
The back-end is a hand-written tiny framework with RegEx-based routing (including the request method type restrictions) and PSR-0 autoload. As even any microframework would be too bulky for this task, it was clear that it required something like this. I tried to make the clear comments (may be even too many clear comments in some places :)) in the code where necessary so it has to be fairly readable and understandable.
### Front-end
As the UI was one of the major values of the task requirements, I picked up the neat **Bootstrap** theme (to save time mostly) and removed everything that wasn't necessary from it. Then I considered the applicability of the ReactJS for this UI and, after giving it a serious thought, decided not to use it because the task seemed to be too simple to require React. But nevertheless I used the **Handlebars** templates engine to simplify the client-side rendering of the UI parts.

The entire front-end logics is located in `main.js` where there is a vanilla JS controller with the simple methods that power the UI updates and perform the interaction with the Algolia index using the Algolia JavaScript API.

I would say that the complexity of the `main.js` is on the edge where one can think of starting using ReactJS before adding any more features to it, but for now it does well enough without it.

## Thank you for reading :)
