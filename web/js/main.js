(function ($) {
    var AUTOCOMPLETE_DELAY = 50;
    var AUTOCOMPLETE_ITEMS_IN_FEED = 10;
    var ITEMS_ON_PAGE = 15;
    var PLACEHOLDER_IMAGE_PATH = '/img/placeholder-image.png';

    function MainController() {
        this.elements = {};
        this.templates = {};
        this.algolia_client = null;
        this.algolia_index = null;
        this.current_query = '';
        this.current_category = '';
        this.searching_in_category = false;
        this.pages_loaded = 0;
        this.current_pages_number = 0;
    }

    MainController.prototype = {
        /**
         * INITIALIZATION METHODS
         */

        /**
         * Inits the Algolia search connection and index.
         */
        initAlgoliaIndex: function () {
            var self = this;

            self.algolia_client = algoliasearch('JS7TG4PFI2', '6c17ecb855533edebe856bd1f5f549ea');
            self.algolia_index = self.algolia_client.initIndex('apps');
        },

        /**
         * Inits the Handlebars helpers.
         */
        initHandlebars: function () {
            Handlebars.registerHelper('uriencode', function(str) {
                return encodeURIComponent(str);
            });
        },

        /**
         * Inits the Algolia search connection and index.
         */
        initCategoriesListAndBindEvents: function () {
            var self = this;

            // Sending the empty request to the Algolia index to fetch the entire list of the available categories in the response.
            self.algolia_index.search('', { facets: ['category'] }, function (error, result) {
                var categories = [];

                // Collecting the categories names in the array.
                if (!error) {
                    for (var category_name in result.facets.category) {
                        categories.push(category_name);
                    }
                }

                // Rendering the categories filter based on the derived categories.
                $('#categories_list_container').html(
                    self.templates.categories_list({ items: categories })
                );

                // Initializing the controller elements collection categories list fields.
                self.elements.$categories = $('.sidebar-nav .nav-list li');
                self.elements.$categories_links = $('.sidebar-nav .nav-list a');

                // Binding handlers to the categories.
                self.elements.$categories_links.click(function (event) {
                    self.interfaceSelectCategory(decodeURIComponent($(this).attr('href').substr(1)));
                });

                // If the category is selected — setting it to the UI.
                self.markCategorySelected(self.current_category);
            });
        },

        /**
         * Inits the interface elements collection.
         */
        initElements: function () {
            this.elements = $.extend({}, {
                $search_input: $('#search'),
                $clear_search_query_button: $('#clear_search_query'),
                $in_category_button: $('#in_category_button'),
                $results_found_number: $('#results_found_number'),
                $search_form: $('#search_form'),
                $search_results: $('#search_results'),
                $categories: $(), // It's left for late initialization in initCategoriesListAndBindEvents().
                $categories_links: $(), // It's left for late initialization initCategoriesListAndBindEvents().
                $load_more_button: $('#load_more')
            });
        },

        /**
         * Inits the handlebars templates of the page.
         */
        initTemplates: function () {
            this.templates = $.extend({}, {
                categories_list: Handlebars.compile($('#categories-list-template').html()),
                autocomplete_item: Handlebars.compile($('#autocomplete-item-template').html()),
                list: Handlebars.compile($('#list-template').html())
            });
        },

        /**
         * Renders the initial search results.
         */
        initSearchInterfaceAndResults: function () {
            var self = this;

            // Initializing the initial search input value.
            if (self.elements.$search_input.val()) {
                self.current_query = self.elements.$search_input.val();
            }

            // Initializing the category initial filtering.
            if (window.location.hash) {
                self.current_category = decodeURIComponent(window.location.hash.substr(1));
            }
            self.markCategorySelected(self.current_category);

            // Initializing the "In Category" search modifier initial state.
            self.searching_in_category = !!(self.current_query && self.current_category);
            self.elements.$in_category_button.toggleClass('active', self.searching_in_category);

            // Rendering the initial search results.
            self.refreshSearchResults();
        },

        /**
         * Binds interface events.
         */
        bindEvents: function () {
            var self = this;

            // Initializing the jQueryUI autocomplete plugin to make it fetch the feed from Algolia index,
            // render the autocomplete feed items with our template
            // and perform the search after the item was selected from the feed.
            self.elements.$search_input.autocomplete({
                minLength: 0,
                delay: AUTOCOMPLETE_DELAY,
                source: self.fetchAutocompleteResults.bind(self)
            })
                .on('autocompleteselect', function (event, ui) {
                    self.interfaceSubmitSearchForm();
                })
                .autocomplete('instance')._renderItem = function( ul, item ) {
                    var $li = $(self.templates.autocomplete_item({ item: item }));
                    return $li.appendTo(ul);
                };

            // Clear search button.
            self.elements.$clear_search_query_button.click(function (event) {
                self.interfaceClearSearchQuery();
            });

            // In Category search modifier button.
            self.elements.$in_category_button.click(function (event) {
                self.interfaceToggleSearchingInCategory();
            });

            // Search form submit.
            self.elements.$search_form.submit(function (event) {
                event.preventDefault();
                self.interfaceSubmitSearchForm();
            });

            // "Pagination" button.
            self.elements.$load_more_button.click(function (event) {
                self.interfaceLoadMore();
            });
        },

        /**
         * Binds interface events to an item of the search results.
         * @param items
         */
        bindSearchItemsEvents: function (items) {
            var self = this;

            // Binding the category selection to the search results categories labels.
            $(items).find('.thumbnail-category a').click(function (event) {
                self.interfaceSelectCategory(decodeURIComponent($(this).attr('href').substr(1)));
            });
        },



        /**
         * UTILITY METHODS
         */

        /**
         * Decodes HTML entities in a given string.
         * @param encoded_string
         * @returns {string}
         */
        htmlEntityDecode: function (encoded_string) {
            return $('<textarea />').html(encoded_string).text();
        },

        /**
         * Fetches the search results and calls the given response_callback passing the search_results array as a parameter.
         * @param request The search query string.
         * @param parameters Object with the Algolia search parameters. Can be omitted.
         * @param response_callback A closure to be called after the search request is completed.
         */
        fetchSearchResults: function (request, parameters, response_callback) {
            var self = this,
                default_parameters = {
                    hitsPerPage: ITEMS_ON_PAGE
                };

            if (self.current_category) {
                default_parameters.filters = 'category:"'+self.current_category+'"';
            }

            // To make it possible to omit the "parameters" param.
            if ($.isFunction(parameters)) {
                response_callback = parameters;
                parameters = {};
            }

            // Compiling the resulting list of the search parameters.
            var search_options = $.extend(default_parameters, parameters);

            // Performing the Algolia index search.
            self.algolia_index.search(request, search_options, function (error, result) {
                var search_results = [];

                if (!error) {
                    // After each search it's necessary to save the properties of the fetched results to update the UI properly.
                    self.setResultsFoundNumber(result.nbHits);
                    self.current_pages_number = result.nbPages;
                    self.pages_loaded = result.page + 1;

                    // Preparing the search results items object to be passed to the response_callback
                    // by replacing the empty image paths with the image placeholder path.
                    search_results = result.hits;
                    for (var ii in search_results) {
                        if (!search_results[ii].image) {
                            search_results[ii].image = PLACEHOLDER_IMAGE_PATH;
                        }
                    }
                }

                return error ? response_callback(error) : response_callback(search_results)
            });
        },

        /**
         * Fetches the search results and calls the given response_callback.
         * This method is optimized to be a source-callback for jQueryUI autocomplete plugin.
         * @param request Object with a single field "term", that contains the search query.
         * @param response_callback A closure to be called after the search request is completed.
         */
        fetchAutocompleteResults: function (request, response_callback) {
            var self = this,
                search_options = { hitsPerPage: AUTOCOMPLETE_ITEMS_IN_FEED };

            if (self.searching_in_category) {
                search_options.filters = 'category:"'+self.current_category+'"';
            }

            // Performing the Algolia index search.
            self.algolia_index.search(request.term, search_options, function (error, result) {
                var search_results = result.hits;

                // Preparing the "value" field of the items to make the jQueryUI autocomplete
                // be able to place the correct value in the search input after user chooses
                // the item from the autocomplete field.
                for (var ii in search_results) {
                    search_results[ii].value = self.htmlEntityDecode(search_results[ii].name);
                }

                return error ? response_callback(error) : response_callback(search_results);
            });
        },

        /**
         * Renders the search results into the search results feed.
         * @param items
         */
        renderSearchResults: function (items) {
            var self = this;

            // Appending the search results HTML to the search results container.
            self.elements.$search_results.append(
                self.templates.list({ items: items })
            );

            // Binding the necessary event handlers to these items.
            self.bindSearchItemsEvents(self.elements.$search_results.children());
        },

        /**
         * Refreshes the search results according to the current values of the query string and the category.
         * Resets the number of loaded pages.
         */
        refreshSearchResults: function () {
            var self = this;

            self.pages_loaded = 0;

            // Fetching the first page of the results from the index.
            self.fetchSearchResults(self.current_query, { page: 0 }, function (search_results) {
                // In this case, when we fetch the first page, we have to explicitly empty the search results container,
                // because the search results rendering doesn't do that by default.
                self.elements.$search_results.empty();

                // Rendering the fetched results to the search results container.
                self.renderSearchResults(search_results);

                // Refreshing the visibility of the "pagination" button.
                self.refreshLoadMoreButtonState();
            });
        },

        /**
         * Append a new page of fetched according to the current values of the query string and the category search results to the already shown results.
         */
        appendNewSearchResultsPage: function () {
            var self = this;

            // Fetching the next page of the results from the index.
            self.fetchSearchResults(self.current_query, { page: self.pages_loaded }, function (search_results) {
                // Rendering the fetched results to the search results container.
                self.renderSearchResults(search_results);

                // Refreshing the visibility of the "pagination" button.
                self.refreshLoadMoreButtonState();
            });
        },

        /**
         * Marks the given category selected.
         */
        markCategorySelected: function (category) {
            var self = this;

            // Unmarking all categories and marking only the selected one.
            self.elements.$categories.removeClass('active');
            self.elements.$categories_links.filter('[href="#'+category+'"]').parent().addClass('active');
        },

        /**
         * Marks "Load more" button either active or inactive.
         */
        refreshLoadMoreButtonState: function () {
            var self = this,
                visible = self.pages_loaded < self.current_pages_number;

            // The button is visible if the number of the loaded pages is LESS than the number of pages
            // in the search results given by the Algolia API.
            self.elements.$load_more_button.toggle(visible);
        },

        /**
         * Sets a number of found results to the interface number container.
         */
        setResultsFoundNumber: function (results_found) {
            var self = this,
                results_found_str = (results_found == 1) ? ' app' : ' apps';

            self.elements.$results_found_number.html(results_found + results_found_str);
        },



        /**
         * INTERFACE HANDLERS
         */

        /**
         * Clears search query field.
         */
        interfaceClearSearchQuery: function () {
            var self = this;

            // Clearing the UI search string value and the corresponding controller property,
            // and then refreshing the search results.
            self.current_query = '';
            self.elements.$search_input.val('');
            self.refreshSearchResults();
        },

        /**
         * Toggles "In Category" button state.
         */
        interfaceToggleSearchingInCategory: function () {
            var self = this;

            // Inverting the controller property value and the state of the class on the button.
            self.elements.$in_category_button.toggleClass('active');
            self.searching_in_category = !self.searching_in_category;
        },

        /**
         * Submits the search form.
         */
        interfaceSubmitSearchForm: function () {
            var self = this;

            // Synchronizing the UI input value and the controller property value.
            self.current_query = self.elements.$search_input.val();

            // If it's not explicitly set by the "In Category" button we clear the value of the chosen category
            // and perform the search in all categories.
            if (!self.searching_in_category) {
                self.current_category = '';
                self.markCategorySelected(self.current_category);
            }

            // Fetching and rendering the results.
            self.refreshSearchResults();
        },

        /**
         * Selects the category in the list of the categories.
         */
        interfaceSelectCategory: function (category) {
            var self = this;

            // If it's not explicitly set by the "In Category" button we clear the value of the search input
            // and perform the search with only the category filter.
            if (!self.searching_in_category) {
                self.current_query = '';
                self.elements.$search_input.val('');
            }

            // saving the passed value in the controller property.
            self.current_category = category;

            // Fetching and rendering the results.
            self.refreshSearchResults();

            // Setting the UI display the category choice.
            self.markCategorySelected(category);
        },

        /**
         * Selects the category in the list of the categories.
         */
        interfaceLoadMore: function () {
            var self = this;

            self.appendNewSearchResultsPage();
        },

        /**
         * Runs the initialization of the interface.
         */
        run: function () {
            // With no Handlebars present the UI cannot be rendered, so there's no point in going further without.
            if (Handlebars===undefined) {
                console.error('Handlebars module required for this page hasn\'t been found.');
                return;
            }

            // The order of the initialization methods calls matters.
            this.initAlgoliaIndex();
            this.initHandlebars();
            this.initTemplates();
            this.initElements();
            this.initCategoriesListAndBindEvents();
            this.bindEvents();
            this.initSearchInterfaceAndResults();
        }
    }

    var controller = new MainController();
    controller.run();
})(jQuery);