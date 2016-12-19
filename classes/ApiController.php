<?php
use Framework\Component;

/**
 * Class ApiController
 * The REST API controller.
 */
class ApiController extends Component {
	const ALGOLIA_APPLICATION_ID = 'JS7TG4PFI2';
	const ALGOLIA_ADMIN_API_KEY = 'd96d7a95a045d31194740a8f7b45b1c8'; // ADMIN KEY! DO NOT SHOW IT TO ANYONE!
	const ALGOLIA_INDEX_NAME = 'apps';

	/**
	 * Algolia client instance.
	 * @var \AlgoliaSearch\Client
	 */
	private $algolia_client;

	/**
	 * Algolia search instance.
	 * @var \AlgoliaSearch\Index
	 */
	private $algolia_index;

	private function initAlgoliaIndex() {
		$this->algolia_client = new \AlgoliaSearch\Client(self::ALGOLIA_APPLICATION_ID, self::ALGOLIA_ADMIN_API_KEY);
		$this->algolia_index = $this->algolia_client->initIndex(self::ALGOLIA_INDEX_NAME);
	}

	/**
	 * Renders the response and terminates the script execution.
	 * @param mixed $data Can be omitted in the case when you need to send the empty response. Passing the empty string will cause the method to echo and render it.
	 */
	private function renderResponse() {
		$args = func_get_args();
		$empty_response = !count($args);
		if (!$empty_response) {
			$data = reset($args);
		}

		switch ($_SERVER['HTTP_ACCEPT']) {

			case 'application/json':
				header('Content-Type: application/json');
				if (!$empty_response) {
					echo json_encode($data);
				}
				break;

			default:
				$content_type = $_SERVER['HTTP_ACCEPT']=='text/html' ? 'text/html' : 'text/plain';
				header('Content-Type: '.$content_type);

				if (!$empty_response) {
					echo is_array($data) ? http_build_query($data) : $data;
				}
				break;

		}

		exit(0);
	}

	/**
	 * Sends response "201 Created".
	 */
	private function sendCreatedResponse($data) {
		http_response_code(201);
		$this->renderResponse($data);
	}

	/**
	 * Sends response "204 No Content".
	 */
	private function sendSuccessNoContentResponse() {
		http_response_code(204);
		$this->renderResponse();
	}

	/**
	 * Sends response "400 Bad Request".
	 */
	private function sendBadRequestResponse() {
		http_response_code(400);
		$this->renderResponse();
	}

	/**
	 * @method POST
	 * @pattern /api/1/apps
	 */
	public function actionAdd() {
		$this->initAlgoliaIndex();

		// Getting the passed JSON object.
		$json_data = file_get_contents('php://input');
		$posted_object = json_decode($json_data, true);

		// Validating the parsed JSON object.
		if (
			json_last_error() !== JSON_ERROR_NONE
			|| empty($posted_object)
			|| !is_array($posted_object)
			|| (array_keys($posted_object) === range(0, count($posted_object) - 1)) // is not an associative array
		) {
			$this->sendBadRequestResponse();
		}

		// Requesting the Algolia index to add the valid object.
		$response = $this->algolia_index->addObject($posted_object);

		// Sending back the response.
		if ($response['objectID']) {
			$this->sendCreatedResponse([ 'objectID' => $response['objectID'] ]);
		}
		else {
			$this->sendBadRequestResponse();
		}
	}

	/**
	 * @method DELETE
	 * @pattern /api/1/apps/([^/]+)
	 */
	public function actionDelete($id) {
		$this->initAlgoliaIndex();

		// Requesting the Algolia index to delete the object with the given ID.
		$response = $this->algolia_index->deleteObject($id);

		// Sending back the response.
		if ($response['deletedAt'] && $response['taskID']) {
			$this->sendSuccessNoContentResponse();
		}
		else {
			$this->sendBadRequestResponse();
		}
	}
}