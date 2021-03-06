<?php
namespace wcf\system\package;
use wcf\system\menu\acp\ACPMenu;
use wcf\data\application\ApplicationEditor;
use wcf\data\language\LanguageEditor;
use wcf\data\package\installation\queue\PackageInstallationQueue;
use wcf\data\package\installation\queue\PackageInstallationQueueEditor;
use wcf\data\package\Package;
use wcf\data\package\PackageEditor;
use wcf\system\cache\CacheHandler;
use wcf\system\database\util\PreparedStatementConditionBuilder;
use wcf\system\exception\SystemException;
use wcf\system\form;
use wcf\system\form\container;
use wcf\system\form\element;
use wcf\system\WCF;
use wcf\util\FileUtil;
use wcf\util\HeaderUtil;
use wcf\util\StringUtil;

/**
 * PackageInstallationDispatcher handles the whole installation process.
 *
 * @author	Alexander Ebert
 * @copyright	2001-2011 WoltLab GmbH
 * @license	GNU Lesser General Public License <http://opensource.org/licenses/lgpl-license.php>
 * @package	com.woltlab.wcf
 * @subpackage	system.package
 * @category 	Community Framework
 */
class PackageInstallationDispatcher {
	/**
	 * current installation type
	 *
	 * @var	string
	 */
	protected $action = '';
	
	/**
	 * instance of PackageArchive
	 *
	 * @var	PackageArchive
	 */
	public $archive = null;
	
	/**
	 * instance of PackageInstallationNodeBuilder
	 *
	 * @var	PackageInstallationNodeBuilder
	 */
	public $nodeBuilder = null;
	
	/**
	 * instance of Package
	 *
	 * @var	Package
	 */
	public $package = null;
	
	/**
	 * instance of PackageInstallationQueue
	 *
	 * @var	PackageInstallationQueue
	 */
	public $queue = null;
	
	/**
	 * default name of the config file
	 *
	 * @var string
	 */
	const CONFIG_FILE = 'config.inc.php';
	
	/**
	 * Creates a new instance of PackageInstallationDispatcher.
	 *
	 * @param	PackageInstallationQueue	$queue
	 */
	public function __construct(PackageInstallationQueue $queue) {
		$this->queue = $queue;
		$this->nodeBuilder = new PackageInstallationNodeBuilder($this);
		
		$this->action = $this->queue->action;
	}
	
	/**
	 * Installs node components and returns next node.
	 *
	 * @param	string		$node
	 * @return	PackageInstallationStep
	 */
	public function install($node) {
		$nodes = $this->nodeBuilder->getNodeData($node);
		
		// invoke node-specific actions
		foreach ($nodes as $data) {
			$nodeData = unserialize($data['nodeData']);
			
			switch ($data['nodeType']) {
				case 'package':
					$step = $this->installPackage($nodeData);
				break;
				
				case 'pip':
					$step = $this->executePIP($nodeData);
				break;
			}
			
			if ($step->splitNode()) {
				$this->nodeBuilder->insertNode($node, $data['sequenceNo']);
				break;
			}
		}
		
		// mark node as completed
		$this->nodeBuilder->completeNode($node);
		
		// assign next node
		$step->setNode($this->nodeBuilder->getNextNode($node));
		
		return $step;
	}
	
	/**
	 * Returns current package archive.
	 *
	 * @return	PackageArchive
	 */
	public function getArchive() {
		if ($this->archive === null) {
			$this->archive = new PackageArchive($this->queue->archive, $this->getPackage());
			
			if (FileUtil::isURL($this->archive->getArchive())) {
				// get return value and update entry in
				// package_installation_queue with this value
				$archive = $this->archive->downloadArchive();
				$queueEditor = new PackageInstallationQueueEditor($this->queue);
				$queueEditor->update(array(
					'archive' => $archive
				));
			}
			
			$this->archive->openArchive();
		}
		
		return $this->archive;
	}
	
	/**
	 * Installs current package.
	 *
	 * @param	array		$nodeData
	 */
	protected function installPackage(array $nodeData) {
		$installationStep = new PackageInstallationStep();
		
		if (!$this->queue->packageID) {
			// create package entry
			$package = PackageEditor::create($nodeData);
			
			// update package id for current queue
			$queueEditor = new PackageInstallationQueueEditor($this->queue);
			$queueEditor->update(array(
				'packageID' => $package->packageID
			));
			
			// save excluded packages
			if (count($this->getArchive()->getExcludedPackages()) > 0) {
				$sql = "INSERT INTO	wcf".WCF_N."_package_exclusion 
							(packageID, excludedPackage, excludedPackageVersion)
					VALUES 		(?, ?, ?)";
				$statement = WCF::getDB()->prepareStatement($sql);
				
				foreach ($this->getArchive()->getExcludedPackages() as $excludedPackage) {
					$statement->execute(array($package->packageID, $excludedPackage['name'], (!empty($excludedPackage['version']) ? $excludedPackage['version'] : '')));
				}
			}
			
			// insert requirements and dependencies
			$requirements = $this->getArchive()->getAllExistingRequirements();
			if (count($requirements) > 0) {
				$sql = "INSERT INTO	wcf".WCF_N."_package_requirement
							(packageID, requirement)
					VALUES		(?, ?)";
				$statement = WCF::getDB()->prepareStatement($sql);
				
				foreach ($requirements as $identifier => $possibleRequirements) {
					if (count($possibleRequirements) == 1) $requirement = array_shift($possibleRequirements);
					else {
						$requirement = $possibleRequirements[$this->selectedRequirements[$identifier]];
					}
					
					$statement->execute(array($package->packageID, $requirement['packageID']));
				}
			}
			
			// build requirement map
			Package::rebuildPackageRequirementMap($package->packageID);
			
			// rebuild dependencies
			Package::rebuildPackageDependencies($package->packageID);
			if ($this->action == 'update') {
				Package::rebuildParentPackageDependencies($package->packageID);
			}
			
			// reload queue
			$this->queue = new PackageInstallationQueue($this->queue->queueID);
			$this->package = null;
			
			if ($package->standalone) {
				// insert as application
				ApplicationEditor::create(array(
					'domainName' => '',
					'packageID' => $package->packageID
				));
			}
			
			// insert dependencies on parent package if applicable
			$this->installPackageParent();
		}
		
		if ($this->getPackage()->standalone && $this->getPackage()->package != 'com.woltlab.wcf' && $this->getAction() == 'install') {
			if (empty($this->getPackage()->packageDir)) {
				$document = $this->promptPackageDir();
				if ($document !== null && $document instanceof form\FormDocument) {
					$installationStep->setDocument($document);
				}
				
				$installationStep->setSplitNode();
			}
		}
		else if ($this->getPackage()->parentPackageID) {
			$packageEditor = new PackageEditor($this->getPackage());
			$packageEditor->update(array(
				'packageDir' => $this->getPackage()->getParentPackage()->packageDir
			));
		}
		
		return $installationStep;
	}
	
	/**
	 * Sets parent package and rebuilds dependencies for both.
	 */	
	protected function installPackageParent() {
		// do not handle parent package if current package is standalone or does not have a plugin tag while within installation process
		if ($this->getArchive()->getPackageInfo('standalone') || $this->getAction() != 'install' || !$this->getArchive()->getPackageInfo('plugin')) {
			return;
		}
		
		// get parent package from requirements
		$sql = "SELECT	requirement
			FROM	wcf".WCF_N."_package_requirement
			WHERE	packageID = ?
				AND requirement IN (
					SELECT	packageID
					FROM	wcf".WCF_N."_package
					WHERE	package = ?
				)";
		$statement = WCF::getDB()->prepareStatement($sql);
		$statement->execute(array(
			$this->getPackage()->packageID,
			$this->getArchive()->getPackageInfo('plugin')
		));
		$row = $statement->fetchArray();
		if (!$row || empty($row['requirement'])) {
			throw new SystemException("can not find any available installations of required parent package '".$this->getArchive()->getPackageInfo('plugin')."'");
		}
		
		// save parent package
		$packageEditor = new PackageEditor($this->getPackage());
		$packageEditor->update(array(
			'parentPackageID' => $row['requirement']
		));
		
		// rebuild parent package dependencies								
		Package::rebuildParentPackageDependencies($this->getPackage()->packageID);
		
		// rebuild parent's parent package dependencies
		Package::rebuildParentPackageDependencies($row['requirement']);
		
		// reload package object on next request
		$this->package = null;
	}
	
	/**
	 * Executes a package installation plugin.
	 *
	 * @param	array		$nodeData
	 * @return	boolean
	 */
	protected function executePIP(array $nodeData) {
		$installationStep = new PackageInstallationStep();
		
		// fetch all pips associated with current PACKAGE_ID and include pips
		// previously installed by current installation queue
		$sql = "SELECT	className
			FROM	wcf".WCF_N."_package_installation_plugin
			WHERE	pluginName = ?";
		$statement = WCF::getDB()->prepareStatement($sql);
		$statement->execute(array(
			$nodeData['pip']
		));
		$row = $statement->fetchArray();
		
		// PIP is unknown
		if (!$row) {
			throw new SystemException("unable to find package installation plugin '".$nodeData['pip']."'");
		}
		
		// valdidate class definition
		$className = $row['className'];
		if (!class_exists($className)) {
			throw new SystemException("unable to find class '".$className."'");
		}
		
		$plugin = new $className($this, $nodeData);
		
		if (!($plugin instanceof \wcf\system\package\plugin\IPackageInstallationPlugin)) {
			throw new SystemException("class '".$className."' does not implement the interface 'wcf\system\package\plugin\IPackageInstallationPlugin'");
		}
		
		// execute PIP
		try {
			$plugin->{$this->action}();
		}
		catch (SplitNodeException $e) {
			$installationStep->setSplitNode();
		}
		
		return $installationStep;
	}
	
	/**
	 * Extracts files from .tar (or .tar.gz) archive and installs them
	 *
	 * @param 	string 			$targetDir
	 * @param 	string 			$sourceArchive
	 * @param	FileHandler		$fileHandler
	 * @return	Installer
	 */
	public function extractFiles($targetDir, $sourceArchive, $fileHandler = null) {
		return new \wcf\system\setup\Installer($targetDir, $sourceArchive, $fileHandler);
	}
	
	/**
	 * Returns current package.
	 *
	 * @return	Package
	 */
	public function getPackage() {
		if ($this->package === null) {
			$this->package = new Package($this->queue->packageID);
		}
		
		return $this->package;
	}
	
	/**
	 * Prompts for a text input for package directory (applies for standalone-applications only)
	 *
	 * @return	FormDocument
	 */
	protected function promptPackageDir() {
		if (!PackageInstallationFormManager::findForm($this->queue, 'packageDir')) {
			$container = new container\GroupFormElementContainer();
			$packageDir = new element\TextInputFormElement($container);
			$packageDir->setName('packageDir');
			$packageDir->setLabel(WCF::getLanguage()->get('wcf.acp.package.packageDir.input'));
			
			$defaultPath = FileUtil::addTrailingSlash(FileUtil::unifyDirSeperator($_SERVER['DOCUMENT_ROOT']));
			$packageDir->setValue($defaultPath);
			$container->appendChild($packageDir);
			
			$document = new form\FormDocument('packageDir');
			$document->appendContainer($container);
			
			PackageInstallationFormManager::registerForm($this->queue, $document);
			return $document;
		}
		else {
			$document = PackageInstallationFormManager::getForm($this->queue, 'packageDir');
			$document->handleRequest();
			$packageDir = $document->getValue('packageDir');
			
			if ($packageDir !== null) {
				$packageEditor = new PackageEditor($this->getPackage());
				$packageEditor->update(array(
					'packageDir' => FileUtil::getRelativePath(WCF_DIR, $packageDir)
				));
				
				// create directory and set permissions
				@mkdir($packageDir, 0777, true);
				@chmod($packageDir, 0777);
			}
			
			return null;
		}
	}
	
	/**
	 * Returns current package id.
	 *
	 * @return	integer
	 */
	public function getPackageID() {
		return $this->queue->packageID;
	}
	
	/**
	 * Returns current package installation type.
	 *
	 * @return	string
	 */
	public function getAction() {
		return $this->action;
	}
	
	/**
	 * Opens the package installation queue and
	 * starts the installation, update or uninstallation of the first entry.
	 *
	 * @param	integer		$parentQueueID
	 * @param 	integer		$processNo
	 */
	public static function openQueue($parentQueueID = 0, $processNo = 0) {
		$conditions = new PreparedStatementConditionBuilder();
		$conditions->add("userID = ?", array(WCF::getUser()->userID));
		$conditions->add("parentQueueID = ?", array($parentQueueID));
		if ($processNo != 0) $conditions->add("processNo = ?", array($processNo));
		$conditions->add("done = ?", array(0));
		
		$sql = "SELECT		*
			FROM		wcf".WCF_N."_package_installation_queue
			".$conditions."
			ORDER BY	queueID ASC";
		$statement = WCF::getDB()->prepareStatement($sql);
		$statement->execute($conditions->getParameters());
		$packageInstallation = $statement->fetchArray();
		
		if (!isset($packageInstallation['queueID'])) {
			HeaderUtil::redirect('index.php?page=PackageList'.SID_ARG_2ND_NOT_ENCODED);
			exit;
		}
		else {
			HeaderUtil::redirect('index.php?page=Package&action='.$packageInstallation['action'].'&queueID='.$packageInstallation['queueID'].''.SID_ARG_2ND_NOT_ENCODED);
			exit;
		}
	}
	
	/**
	 * Displays last confirmation before plugin installation.
	 */
	public function beginInstallation() {
		// get requirements
		$requirements = $this->getArchive()->getRequirements();
		$openRequirements = $this->getArchive()->getOpenRequirements();
		
		$updatableInstances = array();
		$missingPackages = 0;
		foreach ($requirements as $key => $requirement) {
			if (isset($openRequirements[$requirement['name']])) {
				$requirements[$key]['open'] = 1;
				$requirements[$key]['action'] = $openRequirements[$requirement['name']]['action'];
				if (!isset($requirements[$key]['file'])) $missingPackages++;
			}
			else {
				$requirements[$key]['open'] = 0;
			}
		}
		
		// get other instances
		if ($this->action == 'install') {
			$updatableInstances = $this->getArchive()->getUpdatableInstances();
		}
		
		ACPMenu::getInstance()->setActiveMenuItem('wcf.acp.menu.link.package');
		WCF::getTPL()->assign(array(
			'archive' => $this->getArchive(),
			'requiredPackages' => $requirements,
			'missingPackages' => $missingPackages,
			'updatableInstances' => $updatableInstances,
			'excludingPackages' => $this->getArchive()->getConflictedExcludingPackages(),
			'excludedPackages' => $this->getArchive()->getConflictedExcludedPackages(),
			'queueID' => $this->queue->queueID
		));
		WCF::getTPL()->display('packageInstallationConfirm');
		exit;
	}
	
	/**
	 * Checks the package installation queue for outstanding entries.
	 *
	 * @return	integer
	 */
	public static function checkPackageInstallationQueue() {
		$sql = "SELECT		queueID
			FROM		wcf".WCF_N."_package_installation_queue
			WHERE 		userID = ?
					AND parentQueueID = 0
					AND done = 0
			ORDER BY	queueID ASC";
		$statement = WCF::getDB()->prepareStatement($sql);
		$statement->execute(array(WCF::getUser()->userID));
		$row = $statement->fetchArray();
		
		if (!$row) {
			return 0;
		}
		
		return $row['queueID'];
	}
	
	/**
	 * Returns next queue within an installation process.
	 *
	 * @return	integer
	 */
	protected function getNextQueue() {
		$sql = "SELECT		queueID
			FROM		wcf".WCF_N."_package_installation_queue
			WHERE		userID = ?
					AND processNo = ?
					AND done = 0
			ORDER BY	queueID ASC";
		$statement = WCF::getDB()->prepareStatement($sql);
		$statement->execute(array(
			WCF::getUser()->userID,
			$this->queue->processNo
		));
		$row = $statement->fetchArray();
		
		if (!$row) {
			return 0;
		}
		
		return $row['queueID'];
	}
	
	/**
	 * Executes post-setup actions.
	 */
	public function completeSetup() {
		// rebuild dependencies
		Package::rebuildPackageDependencies($this->queue->packageID);
		
		// mark queue as done
		$queueEditor = new PackageInstallationQueueEditor($this->queue);
		$queueEditor->update(array(
			'done' => 1
		));
		
		// remove node data
		$this->nodeBuilder->purgeNodes();
		
		// update package version
		if ($this->action == 'update') {
			$packageEditor = new PackageEditor($this->getPackage());
			$packageEditor->update(array(
				'updateDate' => TIME_NOW,
				'packageVersion' => $this->archive->getPackageInfo('version')
			));
		}
		
		// return next queue within the same process no
		$queueID = $this->getNextQueue();
		
		if (!$queueID) {
			// clear language files once whole installation is completed
			LanguageEditor::deleteLanguageFiles();
			
			// reset all caches
			CacheHandler::getInstance()->clear(WCF_DIR.'cache/', '*');
		}
		
		return $queueID;
	}
	
	/**
	 * Updates queue information.
	 */
	public function updatePackage() {
		if (empty($this->queue->packageName)) {
			$queueEditor = new PackageInstallationQueueEditor($this->queue);
			$queueEditor->update(array(
				'packageName' => $this->getArchive()->getPackageInfo('packageName')
			));
			
			// reload queue
			$this->queue = new PackageInstallationQueue($this->queue->queueID);
		}
	}
	
	/**
	 * Validates specific php requirements.
	 * 
	 * @param	array		$requirements
	 * @return	array<array>
	 */
	public static function validatePHPRequirements(array $requirements) {
		$errors = array();
		
		// validate php version
		if (isset($requirements['version'])) {
			$passed = false;
			if (version_compare(PHP_VERSION, $requirements['version'], '>=')) {
				$passed = true;
			}
			
			if (!$passed) {
				$errors['version'] = array(
					'required' => $requirements['version'],
					'installed' => PHP_VERSION
				);
			}
		}
		
		// validate extensions
		if (isset($requirements['extensions'])) {
			foreach ($requirements['extensions'] as $extension) {
				$passed = (extension_loaded($extension)) ? true : false;
				
				if (!$passed) {
					$errors['extension'][] = array(
						'extension' => $extension
					);
				}
			}
		}
		
		// validate settings
		if (isset($requirements['settings'])) {
			foreach ($requirements['settings'] as $setting => $value) {
				$iniValue = ini_get($setting);
				
				$passed = self::compareSetting($setting, $value, $iniValue);
				if (!$passed) {
					$errors['setting'][] = array(
						'setting' => $setting,
						'required' => $value,
						'installed' => ($iniValue === false) ? '(unknown)' : $iniValue
					);
				}
			}
		}
		
		// validate functions
		if (isset($requirements['functions'])) {
			foreach ($requirements['functions'] as $function) {
				$function = StringUtil::toLowerCase($function);
				
				$passed = self::functionExists($function);
				if (!$passed) {
					$errors['function'][] = array(
						'function' => $function
					);
				}
			}
		}
		
		// validate classes
		if (isset($requirements['classes'])) {
			foreach ($requirements['classes'] as $class) {
				$passed = false;
				
				// see: http://de.php.net/manual/en/language.oop5.basic.php
				if (preg_match('~[a-zA-Z_\x7f-\xff][a-zA-Z0-9_\x7f-\xff]*.~', $class)) {
					$globalClass = '\\'.$class;
					
					if (class_exists($globalClass, false)) {
						$passed = true;
					}
				}
				
				if (!$passed) {
					$errors['class'][] = array(
						'class' => $class
					);
				}
			}
				
		}
		
		return $errors;
	}
	
	/**
	 * Validates if an function exists and is not blacklisted by suhosin extension.
	 * 
	 * @param	string		$function
	 * @return	boolean
	 * @see		http://de.php.net/manual/en/function.function-exists.php#77980
	 */	
	protected static function functionExists($function) {
		if (extension_loaded('suhosin')) {
			$blacklist = @ini_get('suhosin.executor.func.blacklist');
			if (!empty($blacklist)) {
				$blacklist = explode(',', $blacklist);
				foreach ($blacklist as $disabledFunction) {
					$disabledFunction = StringUtil::toLowerCase(StringUtil::trim($disabledFunction));
					
					if ($function == $disabledFunction) {
						return false;
					}
				}
			}
		}
		
		return function_exists($function);
	}
	
	/**
	 * Compares settings, converting values into compareable ones.
	 * 
	 * @param	string		$setting
	 * @param	string		$value
	 * @param	mixed		$compareValue
	 * @return	boolean
	 */
	protected static function compareSetting($setting, $value, $compareValue) {
		if ($compareValue === false) return false;
		
		$value = StringUtil::toLowerCase($value);
		$trueValues = array('1', 'on', 'true');
		$falseValues = array('0', 'off', 'false');
		
		// handle values considered as 'true'
		if (in_array($value, $trueValues)) {
			return ($compareValue) ? true : false;
		}
		// handle values considered as 'false'
		else if (in_array($value, $falseValues)) {
			return (!$compareValue) ? true : false;
		}
		else if (!is_numeric($value)) {
			$compareValue = self::convertShorthandByteValue($compareValue);
			$value = self::convertShorthandByteValue($value);
		}
		
		return ($compareValue >= $value) ? true : false;
	}
	
	/**
	 * Converts shorthand byte values into an integer representing bytes.
	 * 
	 * @param	string		$value
	 * @return	integer
	 * @see		http://www.php.net/manual/en/faq.using.php#faq.using.shorthandbytes
	 */
	protected static function convertShorthandByteValue($value) {
		// convert into bytes
		$lastCharacter = StringUtil::substring($value, -1);
		switch ($lastCharacter) {
			// gigabytes
			case 'g':
				return (int)$value * 1073741824;
			break;
			
			// megabytes
			case 'm':
				return (int)$value * 1048576;
			break;
			
			// kilobytes
			case 'k':
				return (int)$value * 1024;
			break;
			
			default:
				return $value;
			break;
		}
	}
}
