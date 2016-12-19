<?php
namespace Framework;

/**
 * Class Router
 * A tiny RegEx patterns in PHPDoc comments based router.
 * @package Framework
 */
class Router extends Component {
	/**
	 * The array of the registered controller classes with their route patterns.
	 * @var array
	 */
	private $registered_controllers = [];

	/**
	 * Return the "path" part of the REQUEST_URI.
	 * @return string|false
	 */
	private function getRequestUriPath() {
		return parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
	}

	/**
	 * Parses the content of an at-attribute in a doc comment.
	 * @param string $attribute_name The name of the attribute (without the @ symbol)
	 * @param string $doc_comment The contents of the doc comment
	 * @return string|null
	 */
	private function parseAttributeFromDocComment($attribute_name, $doc_comment) {
		$doc_comment_lines = explode("\n", $doc_comment);
		foreach ($doc_comment_lines as $doc_comment_line) {
			$line_contents = ltrim($doc_comment_line, "*\t "); // Getting the trimmed line of the PHPDoc.
			if (substr($line_contents, 0, strlen($attribute_name)+1)==='@'.$attribute_name) { // Checking if it's the line with our attribute.
				return trim(substr($line_contents, strlen($attribute_name)+1)); // Returning the rest of the line if it is.
			}
		}

		return null;
	}

	/**
	 * Registers the given controller class name to handle routes with the correspondent given route pattern.
	 * @param $route_pattern
	 * @param $controller_class_name
	 * @return $this
	 */
	public function registerControllerClass($route_pattern, $controller_class_name) {
		$this->registered_controllers[] = [
			'pattern' => $route_pattern,
			'class_name' => $controller_class_name,
		];
		return $this;
	}

	/**
	 * Searches for the request-matching public action method in the given $controller and runs it or throws 404 otherwise.
	 * @param $controller
	 */
	private function callActionMethodNameByController($controller) {
		$path = $this->getRequestUriPath();

		// Iterating the public methods of the given controller.
		$controller_reflection = new \ReflectionClass($controller);
		foreach ($controller_reflection->getMethods(\ReflectionMethod::IS_PUBLIC) as $method) {
			// Retrieving the allowed request methods of the method.
			$request_method = $this->parseAttributeFromDocComment('method', $method->getDocComment());
			if (is_null($request_method)) {
				$request_method = 'GET';
			}

			// Checking if the request method matches the allowed list.
			if (!in_array($_SERVER['REQUEST_METHOD'], explode(',', strtoupper($request_method)))) {
				continue;
			}

			// Retrieving the URI pattern of the method.
			$pattern = $this->parseAttributeFromDocComment('pattern', $method->getDocComment());

			// Checking if the URI pattern matches the current path part of the URI
			// and gathering matches from the pattern to pass them as parameters.
			$matches = [];
			if (preg_match('!^'.$pattern.'$!', $path, $matches)) {
				array_shift($matches); // To remove the $matches[0] that always contains the entire pattern match.
				ob_end_clean();
				call_user_func_array(array($controller, $method->getName()), $matches); // Calling the matched method with the matched parameters.
				return;
			}
		}

		// Nothing found in this controller. 404 time.
		$this->throw404();
	}

	/**
	 * Throws error 404 reply.
	 */
	private function throw404() {
		ob_end_clean();
		header("HTTP/1.0 404 Not Found");
		include(VIEWS_ROOT.'/404.phtml');
		exit(0);
	}

	/**
	 * Searches for the request-matching action of the request-matching controller and runs it or throws 404 otherwise.
	 */
	public function runAction() {
		$path = $this->getRequestUriPath();

		// Iterating the list of the registered controllers to see if their URL patterns match the requested URI path.
		foreach ($this->registered_controllers as $registered_controller) {
			// Checking the match.
			if (preg_match('!^'.$registered_controller['pattern'].'$!', $path)) {
				// Instantiating the matched controller and trying to call the matching method of it.
				$controller = new $registered_controller['class_name'];
				$this->callActionMethodNameByController($controller);
				return;
			}
		}

		$this->throw404();
	}
}