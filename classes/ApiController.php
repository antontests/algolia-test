<?php
use Framework\Component;

/**
 * Class ApiController
 * The REST API controller.
 */
class ApiController extends Component {
	const ALGOLIA_APPLICATION_ID = 'JS7TG4PFI2';
	const ALGOLIA_ADMIN_API_KEY = 'd96d7a95a045d31194740a8f7b45b1c8';
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
	 * Sends response "201 Created".
	 */
	private function sendCreatedResponse($id) {
		http_response_code(201);
		echo $id;
		exit(0);
	}

	/**
	 * Sends response "204 No Content".
	 */
	private function sendSuccessNoContentResponse() {
		http_response_code(204);
		exit(0);
	}

	/**
	 * Sends response "400 Bad Request".
	 */
	private function sendBadRequestResponse() {
		http_response_code(400);
		exit(0);
	}

	/**
	 * @method POST
	 * @pattern /api/1/apps
	 */
	public function actionAdd() {
		$this->initAlgoliaIndex();

		$json_data = file_get_contents('php://input');
		$posted_object = json_decode($json_data, true);

		if (empty($posted_object) || !is_array($posted_object)) {
			$this->sendBadRequestResponse();
		}

		$response = $this->algolia_index->addObject($posted_object);
		if ($response['objectID']) {
			$this->sendCreatedResponse($response['objectID']);
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

		$response = $this->algolia_index->deleteObject($id);
		if ($response['deletedAt'] && $response['taskID']) {
			$this->sendSuccessNoContentResponse();
		}
		else {
			$this->sendBadRequestResponse();
		}
	}
}