extension load. Remember to take care
    * on the correct extension name for case sensitive OSes.
    *
    * @param string $ext The extension name
    * @return bool Success or not on the dl() call
    */
    public static function loadExtension($ext)
    {
        if (extension_loaded($ext)) {
            return true;
        }

        // if either returns true dl() will produce a FATAL error, stop that
        if (
            function_exists('dl') === false ||
            ini_get('enable_dl') != 1
        ) {
            return false;
        }

        if (OS_WINDOWS) {
            $suffix = '.dll';
        } elseif (PHP_OS == 'HP-UX') {
            $suffix = '.sl';
        } elseif (PHP_OS == 'AIX') {
            $suffix = '.a';
        } elseif (PHP_OS == 'OSX') {
            $suffix = '.bundle';
        } else {
            $suffix = '.so';
        }

        return @dl('php_'.$ext.$suffix) || @dl($ext.$suffix);
    }
}

function _PEAR_call_destructors()
{
    global $_PEAR_destructor_object_list;
    if (is_array($_PEAR_destructor_object_list) &&
        sizeof($_PEAR_destructor_object_list))
    {
        reset($_PEAR_destructor_object_list);

        $destructLifoExists = PEAR::getStaticProperty('PEAR', 'destructlifo');

        if ($destructLifoExists) {
            $_PEAR_destructor_object_list = array_reverse($_PEAR_destructor_object_list);
        }

        while (list($k, $objref) = each($_PEAR_destructor_object_list)) {
            $classname = get_class($objref);
            while ($classname) {
                $destructor = "_$classname";
                if (method_exists($objref, $destructor)) {
                    $objref->$destructor();
                    break;
                } else {
                    $classname = get_parent_class($classname);
                }
            }
        }
        // Empty the object list to ensure that destructors are
        // not called more than once.
        $_PEAR_destructor_object_list = array();
    }

    // Now call the shutdown functions
    if (
        isset($GLOBALS['_PEAR_shutdown_funcs']) &&
        is_array($GLOBALS['_PEAR_shutdown_funcs']) &&
        !empty($GLOBALS['_PEAR_shutdown_funcs'])
    ) {
        foreach ($GLOBALS['_PEAR_shutdown_funcs'] as $value) {
            call_user_func_array($value[0], $value[1]);
        }
    }
}

/**
 * Standard PEAR error class for PHP 4
 *
 * This class is supserseded by {@link PEAR_Exception} in PHP 5
 *
 * @category   pear
 * @package    PEAR
 * @author     Stig Bakken <ssb@php.net>
 * @author     Tomas V.V. Cox <cox@idecnet.com>
 * @author     Gregory Beaver <cellog@php.net>
 * @copyright  1997-2006 The PHP Group
 * @license    http://opensource.org/licenses/bsd-license.php New BSD License
 * @version    Release: 1.10.5
 * @link       http://pear.php.net/manual/en/core.pear.pear-error.php
 * @see        PEAR::raiseError(), PEAR::throwError()
 * @since      Class available since PHP 4.0.2
 */
class PEAR_Error
{
    var $error_message_prefix = '';
    var $mode                 = PEAR_ERROR_RETURN;
    var $level                = E_USER_NOTICE;
    var $code                 = -1;
    var $message              = '';
    var $userinfo             = '';
    var $backtrace            = null;

    /**
     * PEAR_Error constructor
     *
     * @param string $message  message
     *
     * @param int $code     (optional) error code
     *
     * @param int $mode     (optional) error mode, one of: PEAR_ERROR_RETURN,
     * PEAR_ERROR_PRINT, PEAR_ERROR_DIE, PEAR_ERROR_TRIGGER,
     * PEAR_ERROR_CALLBACK or PEAR_ERROR_EXCEPTION
     *
     * @param mixed $options   (optional) error level, _OR_ in the case of
     * PEAR_ERROR_CALLBACK, the callback function or object/method
     * tuple.
     *
     * @param string $userinfo (optional) additional user/debug info
     *
     * @access public
     *
     */
    function __construct($message = 'unknown error', $code = null,
                        $mode = null, $options = null, $userinfo = null)
    {
        if ($mode === null) {
            $mode = PEAR_ERROR_RETURN;
        }
        $this->message   = $message;
        $this->code      = $code;
        $this->mode      = $mode;
        $this->userinfo  = $userinfo;

        $skiptrace = PEAR::getStaticProperty('PEAR_Error', 'skiptrace');

        if (!$skiptrace) {
            $this->backtrace = debug_backtrace();
            if (isset($this->backtrace[0]) && isset($this->backtrace[0]['object'])) {
                unset($this->backtrace[0]['object']);
            }
        }

        if ($mode & PEAR_ERROR_CALLBACK) {
            $this->level = E_USER_NOTICE;
            $this->callback = $options;
        } else {
            if ($options === null) {
                $options = E_USER_NOTICE;
            }

            $this->level = $options;
            $this->callback = null;
        }

        if ($this->mode & PEAR_ERROR_PRINT) {
            if (is_null($options) || is_int($options)) {
                $format = "%s";
            } else {
                $format = $options;
            }

            printf($format, $this->getMessage());
        }

        if ($this->mode & PEAR_ERROR_TRIGGER) {
            trigger_error($this->getMessage(), $this->level);
        }

        if ($this->mode & PEAR_ERROR_DIE) {
            $msg = $this->getMessage();
            if (is_null($options) || is_int($options)) {
                $format = "%s";
                if (substr($msg, -1) != "\n") {
                    $msg .= "\n";
                }
            } else {
                $format = $options;
            }
            printf($format, $msg);
            exit($code);
        }

        if ($this->mode & PEAR_ERROR_CALLBACK && is_callable($this->callback)) {
            call_user_func($this->callback, $this);
        }

        if ($this->mode & PEAR_ERROR_EXCEPTION) {
            trigger_error("PEAR_ERROR_EXCEPTION is obsolete, use class PEAR_Exception for exceptions", E_USER_WARNING);
            eval('$e = new Exception($this->message, $this->code);throw($e);');
        }
    }

    /**
     * Only here for backwards compatibility.
     *
     * Class "Cache_Error" still uses it, among others.
     *
     * @param string $message  Message
     * @param int    $code     Error code
     * @param int    $mode     Error mode
     * @param mixed  $options  See __construct()
     * @param string $userinfo Additional user/debug info
     */
    public function PEAR_Error(
        $message = 'unknown error', $code = null, $mode = null,
        $options = null, $userinfo = null
    ) {
        self::__construct($message, $code, $mode, $options, $userinfo);
    }

    /**
     * Get the error mode from an error object.
     *
     * @return int error mode
     * @access public
     */
    function getMode()
    {
        return $this->mode;
    }

    /**
     * Get the callback function/method from an error object.
     *
     * @return mixed callback function or object/method array
     * @access public
     */
    function getCallback()
    {
        return $this->callback;
    }

    /**
     * Get the error message from an error object.
     *
     * @return  string  full error message
     * @access public
     */
    function getMessage()
    {
        return ($this->error_message_prefix . $this->message);
    }

    /**
     * Get error code from an error object
     *
     * @return int error code
     * @access public
     */
     function getCode()
     {
        return $this->code;
     }

    /**
     * Get the name of this error/exception.
     *
     * @return string error/exception name (type)
     * @access public
     */
    function getType()
    {
        return get_class($this);
    }

    /**
     * Get additional user-supplied information.
     *
     * @return string user-supplied information
     * @access public
     */
    function getUserInfo()
    {
        return $this->userinfo;
    }

    /**
     * Get additional debug information supplied by the application.
     *
     * @return string debug information
     * @access public
     */
    function getDebugInfo()
    {
        return $this->getUserInfo();
    }

    /**
     * Get the call backtrace from where the error was generated.
     * Supported with PHP 4.3.0 or newer.
     *
     * @param int $frame (optional) what frame to fetch
     * @return array Backtrace, or NULL if not available.
     * @access public
     */
    function getBacktrace($frame = null)
    {
        if (defined('PEAR_IGNORE_BACKTRACE')) {
            return null;
        }
        if ($frame === null) {
            return $this->backtrace;
        }
        return $this->backtrace[$frame];
    }

    function addUserInfo($info)
    {
        if (empty($this->userinfo)) {
            $this->userinfo = $info;
        } else {
            $this->userinfo .= " ** $info";
        }
    }

    function __toString()
    {
        return $this->getMessage();
    }

    /**
     * Make a string representation of this object.
     *
     * @return string a string with an object summary
     * @access public
     */
    function toString()
    {
        $modes = array();
        $levels = array(E_USER_NOTICE  => 'notice',
                        E_USER_WARNING => 'warning',
                        E_USER_ERROR   => 'error');
        if ($this->mode & PEAR_ERROR_CALLBACK) {
            if (is_array($this->callback)) {
                $callback = (is_object($this->callback[0]) ?
                    strtolower(get_class($this->callback[0])) :
                    $this->callback[0]) . '::' .
                    $this->callback[1];
            } else {
                $callback = $this->callback;
            }
            return sprintf('[%s: message="%s" code=%d mode=callback '.
                           'callback=%s prefix="%s" info="%s"]',
                           strtolower(get_class($this)), $this->message, $this->code,
                           $callback, $this->error_message_prefix,
                           $this->userinfo);
        }
        if ($this->mode & PEAR_ERROR_PRINT) {
            $modes[] = 'print';
        }
        if ($this->mode & PEAR_ERROR_TRIGGER) {
            $modes[] = 'trigger';
        }
        if ($this->mode & PEAR_ERROR_DIE) {
            $modes[] = 'die';
        }
        if ($this->mode & PEAR_ERROR_RETURN) {
            $modes[] = 'return';
        }
        return sprintf('[%s: message="%s" code=%d mode=%s level=%s '.
                       'prefix="%s" info="%s"]',
                       strtolower(get_class($this)), $this->message, $this->code,
                       implode("|", $modes), $levels[$this->level],
                       $this->error_message_prefix,
                       $this->userinfo);
    }
}

/*
 * Local Variables:
 * mode: php
 * tab-width: 4
 * c-basic-offset: 4
 * End:
 */
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               <?php
/**
 * PEAR_Builder for building PHP extensions (PECL packages)
 *
 * PHP versions 4 and 5
 *
 * @category   pear
 * @package    PEAR
 * @author     Stig Bakken <ssb@php.net>
 * @author     Greg Beaver <cellog@php.net>
 * @copyright  1997-2009 The Authors
 * @license    http://opensource.org/licenses/bsd-license.php New BSD License
 * @link       http://pear.php.net/package/PEAR
 * @since      File available since Release 0.1
 *
 * TODO: log output parameters in PECL command line
 * TODO: msdev path in configuration
 */

/**
 * Needed for extending PEAR_Builder
 */
require_once 'PEAR/Common.php';
require_once 'PEAR/PackageFile.php';
require_once 'System.php';

/**
 * Class to handle building (compiling) extensions.
 *
 * @category   pear
 * @package    PEAR
 * @author     Stig Bakken <ssb@php.net>
 * @author     Greg Beaver <cellog@php.net>
 * @copyright  1997-2009 The Authors
 * @license    http://opensource.org/licenses/bsd-license.php New BSD License
 * @version    Release: 1.10.5
 * @link       http://pear.php.net/package/PEAR
 * @since      Class available since PHP 4.0.2
 * @see        http://pear.php.net/manual/en/core.ppm.pear-builder.php
 */
class PEAR_Builder extends PEAR_Common
{
    var $php_api_version = 0;
    var $zend_module_api_no = 0;
    var $zend_extension_api_no = 0;

    var $extensions_built = array();

    /**
     * @var string Used for reporting when it is not possible to pass function
     *             via extra parameter, e.g. log, msdevCallback
     */
    var $current_callback = null;

    // used for msdev builds
    var $_lastline = null;
    var $_firstline = null;

    /**
     * PEAR_Builder constructor.
     *
     * @param object $ui user interface object (instance of PEAR_Frontend_*)
     *
     * @access public
     */
    function __construct(&$ui)
    {
        parent::__construct();
        $this->setFrontendObject($ui);
    }

    /**
     * Build an extension from source on windows.
     * requires msdev
     */
    function _build_win32($descfile, $callback = null)
    {
        if (is_object($descfile)) {
            $pkg = $descfile;
            $descfile = $pkg->getPackageFile();
        } else {
            $pf = new PEAR_PackageFile($this->config, $this->debug);
            $pkg = &$pf->fromPackageFile($descfile, PEAR_VALIDATE_NORMAL);
            if (PEAR::isError($pkg)) {
                return $pkg;
            }
        }
        $dir = dirname($descfile);
        $old_cwd = getcwd();

        if (!file_exists($dir) || !is_dir($dir) || !chdir($dir)) {
            return $this->raiseError("could not chdir to $dir");
        }

        // packages that were in a .tar have the packagefile in this directory
        $vdir = $pkg->getPackage() . '-' . $pkg->getVersion();
        if (file_exists($dir) && is_dir($vdir)) {
            if (!chdir($vdir)) {
                return $this->raiseError("could not chdir to " . realpath($vdir));
            }

            $dir = getcwd();
        }

        $this->log(2, "building in $dir");

        $dsp = $pkg->getPackage().'.dsp';
        if (!file_exists("$dir/$dsp")) {
            return $this->raiseError("The DSP $dsp does not exist.");
        }
        // XXX TODO: make release build type configurable
        $command = 'msdev '.$dsp.' /MAKE "'.$pkg->getPackage(). ' - Release"';

        $err = $this->_runCommand($command, array(&$this, 'msdevCallback'));
        if (PEAR::isError($err)) {
            return $err;
        }

        // figure out the build platform and type
        $platform = 'Win32';
        $buildtype = 'Release';
        if (preg_match('/.*?'.$pkg->getPackage().'\s-\s(\w+)\s(.*?)-+/i',$this->_firstline,$matches)) {
            $platform = $matches[1];
            $buildtype = $matches[2];
        }

        if (preg_match('/(.*)?\s-\s(\d+).*?(\d+)/', $this->_lastline, $matches)) {
            if ($matches[2]) {
                // there were errors in the build
                return $this->raiseError("There were errors during compilation.");
            }
            $out = $matches[1];
        } else {
            return $this->raiseError("Did not understand the completion status returned from msdev.exe.");
        }

        // msdev doesn't tell us the output directory :/
        // open the dsp, find /out and use that directory
        $dsptext = join(file($dsp),'');

        // this regex depends on the build platform and type having been
        // correctly identified above.
        $regex ='/.*?!IF\s+"\$\(CFG\)"\s+==\s+("'.
                    $pkg->getPackage().'\s-\s'.
                    $platform.'\s'.
                    $buildtype.'").*?'.
                    '\/out:"(.*?)"/is';

        if ($dsptext && preg_match($regex, $dsptext, $matches)) {
            // what we get back is a relative path to the output file itself.
            $outfile = realpath($matches[2]);
        } else {
            return $this->raiseError("Could not retrieve output information from $dsp.");
        }
        // realpath returns false if the file doesn't exist
        if ($outfile && copy($outfile, "$dir/$out")) {
            $outfile = "$dir/$out";
        }

        $built_files[] = array(
            'file' => "$outfile",
            'php_api' => $this->php_api_version,
            'zend_mod_api' => $this->zend_module_api_no,
            'zend_ext_api' => $this->zend_extension_api_no,
            );

        return $built_files;
    }
    // }}}

    // {{{ msdevCallback()
    function msdevCallback($what, $data)
    {
        if (!$this->_firstline)
            $this->_firstline = $data;
        $this->_lastline = $data;
        call_user_func($this->current_callback, $what, $data);
    }

    /**
     * @param string
     * @param string
     * @param array
     * @access private
     */
    function _harvestInstDir($dest_prefix, $dirname, &$built_files)
    {
        $d = opendir($dirname);
        if (!$d)
            return false;

        $ret = true;
        while (($ent = readdir($d)) !== false) {
            if ($ent{0} == '.')
                continue;

            $full = $dirname . DIRECTORY_SEPARATOR . $ent;
            if (is_dir($full)) {
                if (!$this->_harvestInstDir(
                        $dest_prefix . DIRECTORY_SEPARATOR . $ent,
                        $full, $built_files)) {
                    $ret = false;
                    break;
                }
            } else {
                $dest = $dest_prefix . DIRECTORY_SEPARATOR . $ent;
                $built_files[] = array(
                        'file' => $full,
                        'dest' => $dest,
                        'php_api' => $this->php_api_version,
                        'zend_mod_api' => $this->zend_module_api_no,
                        'zend_ext_api' => $this->zend_extension_api_no,
                        );
            }
        }
        closedir($d);
        return $ret;
    }

    /**
     * Build an extension from source.  Runs "phpize" in the source
     * directory, but compiles in a temporary directory
     * (TMPDIR/pear-build-USER/PACKAGE-VERSION).
     *
     * @param string|PEAR_PackageFile_v* $descfile path to XML package description file, or
     *               a PEAR_PackageFile object
     *
     * @param mixed $callback callback function used to report output,
     * see PEAR_Builder::_runCommand for details
     *
     * @return array an array of associative arrays with built files,
     * format:
     * array( array( 'file' => '/path/to/ext.so',
     *               'php_api' => YYYYMMDD,
     *               'zend_mod_api' => YYYYMMDD,
     *               'zend_ext_api' => YYYYMMDD ),
     *        ... )
     *
     * @access public
     *
     * @see PEAR_Builder::_runCommand
     */
    function build($descfile, $callback = null)
    {
        if (preg_match('/(\\/|\\\\|^)([^\\/\\\\]+)?php([^\\/\\\\]+)?$/',
                       $this->config->get('php_bin'), $matches)) {
            if (isset($matches[2]) && strlen($matches[2]) &&
                trim($matches[2]) != trim($this->config->get('php_prefix'))) {
                $this->log(0, 'WARNING: php_bin ' . $this->config->get('php_bin') .
                           ' appears to have a prefix ' . $matches[2] . ', but' .
                           ' config variable php_prefix does not match');
            }

            if (isset($matches[3]) && strlen($matches[3]) &&
                trim($matches[3]) != trim($this->config->get('php_suffix'))) {
                $this->log(0, 'WARNING: php_bin ' . $this->config->get('php_bin') .
                           ' appears to have a suffix ' . $matches[3] . ', but' .
                           ' config variable php_suffix does not match');
            }
        }

        $this->current_callback = $callback;
        if (PEAR_OS == "Windows") {
            return $this->_build_win32($descfile, $callback);
        }

        if (PEAR_OS != 'Unix') {
            return $this->raiseError("building extensions not supported on this platform");
        }

        if (is_object($descfile)) {
            $pkg = $descfile;
            $descfile = $pkg->getPackageFile();
            if (is_a($pkg, 'PEAR_PackageFile_v1')) {
                $dir = dirname($descfile);
            } else {
                $dir = $pkg->_config->get('temp_dir') . '/' . $pkg->getName();
                // automatically delete at session end
                $this->addTempFile($dir);
            }
        } else {
            $pf = new PEAR_PackageFile($this->config);
            $pkg = &$pf->fromPackageFile($descfile, PEAR_VALIDATE_NORMAL);
            if (PEAR::isError($pkg)) {
                return $pkg;
            }
            $dir = dirname($descfile);
        }

        // Find config. outside of normal path - e.g. config.m4
        foreach (array_keys($pkg->getInstallationFileList()) as $item) {
          if (stristr(basename($item), 'config.m4') && dirname($item) != '.') {
            $dir .= DIRECTORY_SEPARATOR . dirname($item);
            break;
          }
        }

        $old_cwd = getcwd();
        if (!file_exists($dir) || !is_dir($dir) || !chdir($dir)) {
            return $this->raiseError("could not chdir to $dir");
        }

        $vdir = $pkg->getPackage() . '-' . $pkg->getVersion();
        if (is_dir($vdir)) {
            chdir($vdir);
        }

        $dir = getcwd();
        $this->log(2, "building in $dir");
        putenv('PATH=' . $this->config->get('bin_dir') . ':' . getenv('PATH'));
        $err = $this->_runCommand($this->config->get('php_prefix')
                                . "phpize" .
                                $this->config->get('php_suffix'),
                                array(&$this, 'phpizeCallback'));
        if (PEAR::isError($err)) {
            return $err;
        }

        if (!$err) {
            return $this->raiseError("`phpize' failed");
        }

        // {{{ start of interactive part
        $configure_command = "$dir/configure";

        $phpConfigName = $this->config->get('php_prefix')
            . 'php-config'
            . $this->config->get('php_suffix');
        $phpConfigPath = System::which($phpConfigName);
        if ($phpConfigPath !== false) {
            $configure_command .= ' --with-php-config='
                . $phpConfigPath;
        }

        $configure_options = $pkg->getConfigureOptions();
        if ($configure_options) {
            foreach ($configure_options as $o) {
                $default = array_key_exists('default', $o) ? $o['default'] : null;
                list($r) = $this->ui->userDialog('build',
                                                 array($o['prompt']),
                                                 array('text'),
                                                 array($default));
                if (substr($o['name'], 0, 5) == 'with-' &&
                    ($r == 'yes' || $r == 'autodetect')) {
                    $configure_command .= " --$o[name]";
                } else {
                    $configure_command .= " --$o[name]=".trim($r);
                }
            }
        }
        // }}} end of interactive part

        // FIXME make configurable
        if (!$user=getenv('USER')) {
            $user='defaultuser';
        }

        $tmpdir = $this->config->get('temp_dir');
        $build_basedir = System::mktemp(' -t "' . $tmpdir . '" -d "pear-build-' . $user . '"');
        $build_dir = "$build_basedir/$vdir";
        $inst_dir = "$build_basedir/install-$vdir";
        $this->log(1, "building in $build_dir");
        if (is_dir($build_dir)) {
            System::rm(array('-rf', $build_dir));
        }

        if (!System::mkDir(array('-p', $build_dir))) {
            return $this->raiseError("could not create build dir: $build_dir");
        }

        $this->addTempFile($build_dir);
        if (!System::mkDir(array('-p', $inst_dir))) {
            return $this->raiseError("could not create temporary install dir: $inst_dir");
        }
        $this->addTempFile($inst_dir);

        $make_command = getenv('MAKE') ? getenv('MAKE') : 'make';

        $to_run = array(
            $configure_command,
            $make_command,
            "$make_command INSTALL_ROOT=\"$inst_dir\" install",
            "find \"$inst_dir\" | xargs ls -dils"
            );
        if (!file_exists($build_dir) || !is_dir($build_dir) || !chdir($build_dir)) {
            return $this->raiseError("could not chdir to $build_dir");
        }
        putenv('PHP_PEAR_VERSION=1.10.5');
        foreach ($to_run as $cmd) {
            $err = $this->_runCommand($cmd, $callback);
            if (PEAR::isError($err)) {
                chdir($old_cwd);
                return $err;
            }
            if (!$err) {
                chdir($old_cwd);
                return $this->raiseError("`$cmd' failed");
            }
        }
        if (!($dp = opendir("modules"))) {
            chdir($old_cwd);
            return $this->raiseError("no `modules' directory found");
        }
        $built_files = array();
        $prefix = exec($this->config->get('php_prefix')
                        . "php-config" .
                       $this->config->get('php_suffix') . " --prefix");
        $this->_harvestInstDir($prefix, $inst_dir . DIRECTORY_SEPARATOR . $prefix, $built_files);
        chdir($old_cwd);
        return $built_files;
    }

    /**
     * Message callback function used when running the "phpize"
     * program.  Extracts the API numbers used.  Ignores other message
     * types than "cmdoutput".
     *
     * @param string $what the type of message
     * @param mixed $data the message
     *
     * @return void
     *
     * @access public
     */
    function phpizeCallback($what, $data)
    {
        if ($what != 'cmdoutput') {
            return;
        }
        $this->log(1, rtrim($data));
        if (preg_match('/You should update your .aclocal.m4/', $data)) {
            return;
        }
        $matches = array();
        if (preg_match('/^\s+(\S[^:]+):\s+(\d{8})/', $data, $matches)) {
            $member = preg_replace('/[^a-z]/', '_', strtolower($matches[1]));
            $apino = (int)$matches[2];
            if (isset($this->$member)) {
                $this->$member = $apino;
                //$msg = sprintf("%-22s : %d", $matches[1], $apino);
                //$this->log(1, $msg);
            }
        }
    }

    /**
     * Run an external command, using a message callback to report
     * output.  The command will be run through popen and output is
     * reported for every line with a "cmdoutput" message with the
     * line string, including newlines, as payload.
     *
     * @param string $command the command to run
     *
     * @param mixed $callback (optional) function to use as message
     * callback
     *
     * @return bool whether the command was successful (exit code 0
     * means success, any other means failure)
     *
     * @access private
     */
    function _runCommand($command, $callback = null)
    {
        $this->log(1, "running: $command");
        $pp = popen("$command 2>&1", "r");
        if (!$pp) {
            return $this->raiseError("failed to run `$command'");
        }
        if ($callback && $callback[0]->debug == 1) {
            $olddbg = $callback[0]->debug;
            $callback[0]->debug = 2;
        }

        while ($line = fgets($pp, 1024)) {
            if ($callback) {
                call_user_func($callback, 'cmdoutput', $line);
            } else {
                $this->log(2, rtrim($line));
            }
        }
        if ($callback && isset($olddbg)) {
            $callback[0]->debug = $olddbg;
        }

        $exitcode = is_resource($pp) ? pclose($pp) : -1;
        return ($exitcode == 0);
    }

    function log($level, $msg, $append_crlf = true)
    {
        if ($this->current_callback) {
            if ($this->debug >= $level) {
                call_user_func($this->current_callback, 'output', $msg);
            }
            return;
        }
        return parent::log($level, $msg, $append_crlf);
    }
}
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                <?php
/**
 * PEAR_ChannelFile, the channel handling class
 *
 * PHP versions 4 and 5
 *
 * @category   pear
 * @package    PEAR
 * @author     Greg Beaver <cellog@php.net>
 * @copyright  1997-2009 The Authors
 * @license    http://opensource.org/licenses/bsd-license.php New BSD License
 * @link       http://pear.php.net/package/PEAR
 * @since      File available since Release 1.4.0a1
 */

/**
 * Needed for error handling
 */
require_once 'PEAR/ErrorStack.php';
require_once 'PEAR/XMLParser.php';
require_once 'PEAR/Common.php';

/**
 * Error code if the channel.xml <channel> tag does not contain a valid version
 */
define('PEAR_CHANNELFILE_ERROR_NO_VERSION', 1);
/**
 * Error code if the channel.xml <channel> tag version is not supported (version 1.0 is the only supported version,
 * currently
 */
define('PEAR_CHANNELFILE_ERROR_INVALID_VERSION', 2);

/**
 * Error code if parsing is attempted with no xml extension
 */
define('PEAR_CHANNELFILE_ERROR_NO_XML_EXT', 3);

/**
 * Error code if creating the xml parser resource fails
 */
define('PEAR_CHANNELFILE_ERROR_CANT_MAKE_PARSER', 4);

/**
 * Error code used for all sax xml parsing errors
 */
define('PEAR_CHANNELFILE_ERROR_PARSER_ERROR', 5);

/**#@+
 * Validation errors
 */
/**
 * Error code when channel name is missing
 */
define('PEAR_CHANNELFILE_ERROR_NO_NAME', 6);
/**
 * Error code when channel name is invalid
 */
define('PEAR_CHANNELFILE_ERROR_INVALID_NAME', 7);
/**
 * Error code when channel summary is missing
 */
define('PEAR_CHANNELFILE_ERROR_NO_SUMMARY', 8);
/**
 * Error code when channel summary is multi-line
 */
define('PEAR_CHANNELFILE_ERROR_MULTILINE_SUMMARY', 9);
/**
 * Error code when channel server is missing for protocol
 */
define('PEAR_CHANNELFILE_ERROR_NO_HOST', 10);
/**
 * Error code when channel server is invalid for protocol
 */
define('PEAR_CHANNELFILE_ERROR_INVALID_HOST', 11);
/**
 * Error code when a mirror name is invalid
 */
define('PEAR_CHANNELFILE_ERROR_INVALID_MIRROR', 21);
/**
 * Error code when a mirror type is invalid
 */
define('PEAR_CHANNELFILE_ERROR_INVALID_MIRRORTYPE', 22);
/**
 * Error code when an attempt is made to generate xml, but the parsed content is invalid
 */
define('PEAR_CHANNELFILE_ERROR_INVALID', 23);
/**
 * Error code when an empty package name validate regex is passed in
 */
define('PEAR_CHANNELFILE_ERROR_EMPTY_REGEX', 24);
/**
 * Error code when a <function> tag has no version
 */
define('PEAR_CHANNELFILE_ERROR_NO_FUNCTIONVERSION', 25);
/**
 * Error code when a <function> tag has no name
 */
define('PEAR_CHANNELFILE_ERROR_NO_FUNCTIONNAME', 26);
/**
 * Error code when a <validatepackage> tag has no name
 */
define('PEAR_CHANNELFILE_ERROR_NOVALIDATE_NAME', 27);
/**
 * Error code when a <validatepackage> tag has no version attribute
 */
define('PEAR_CHANNELFILE_ERROR_NOVALIDATE_VERSION', 28);
/**
 * Error code when a mirror does not exist but is called for in one of the set*
 * methods.
 */
define('PEAR_CHANNELFILE_ERROR_MIRROR_NOT_FOUND', 32);
/**
 * Error code when a server port is not numeric
 */
define('PEAR_CHANNELFILE_ERROR_INVALID_PORT', 33);
/**
 * Error code when <static> contains no version attribute
 */
define('PEAR_CHANNELFILE_ERROR_NO_STATICVERSION', 34);
/**
 * Error code when <baseurl> contains no type attribute in a <rest> protocol definition
 */
define('PEAR_CHANNELFILE_ERROR_NOBASEURLTYPE', 35);
/**
 * Error code when a mirror is defined and the channel.xml represents the __uri pseudo-channel
 */
define('PEAR_CHANNELFILE_URI_CANT_MIRROR', 36);
/**
 * Error code when ssl attribute is present and is not "yes"
 */
define('PEAR_CHANNELFILE_ERROR_INVALID_SSL', 37);
/**#@-*/

/**
 * Mirror types allowed.  Currently only internet servers are recognized.
 */
$GLOBALS['_PEAR_CHANNELS_MIRROR_TYPES'] =  array('server');


/**
 * The Channel handling class
 *
 * @category   pear
 * @package    PEAR
 * @author     Greg Beaver <cellog@php.net>
 * @copyright  1997-2009 The Authors
 * @license    http://opensource.org/licenses/bsd-license.php New BSD License
 * @version    Release: 1.10.5
 * @link       http://pear.php.net/package/PEAR
 * @since      Class available since Release 1.4.0a1
 */
class PEAR_ChannelFile
{
    /**
     * @access private
     * @var PEAR_ErrorStack
     * @access private
     */
    var $_stack;

    /**
     * Supported channel.xml versions, for parsing
     * @var array
     * @access private
     */
    var $_supportedVersions = array('1.0');

    /**
     * Parsed channel information
     * @var array
     * @access private
     */
    var $_channelInfo;

    /**
     * index into the subchannels array, used for parsing xml
     * @var int
     * @access private
     */
    var $_subchannelIndex;

    /**
     * index into the mirrors array, used for parsing xml
     * @var int
     * @access private
     */
    var $_mirrorIndex;

    /**
     * Flag used to determine the validity of parsed content
     * @var boolean
     * @access private
     */
    var $_isValid = false;

    function __construct()
    {
        $this->_stack = new PEAR_ErrorStack('PEAR_ChannelFile');
        $this->_stack->setErrorMessageTemplate($this->_getErrorMessage());
        $this->_isValid = false;
    }

    /**
     * @return array
     * @access protected
     */
    function _getErrorMessage()
    {
        return
            array(
                PEAR_CHANNELFILE_ERROR_INVALID_VERSION =>
                    'While parsing channel.xml, an invalid version number "%version% was passed in, expecting one of %versions%',
                PEAR_CHANNELFILE_ERROR_NO_VERSION =>
                    'No version number found in <channel> tag',
                PEAR_CHANNELFILE_ERROR_NO_XML_EXT =>
                    '%error%',
                PEAR_CHANNELFILE_ERROR_CANT_MAKE_PARSER =>
                    'Unable to create XML parser',
                PEAR_CHANNELFILE_ERROR_PARSER_ERROR =>
                    '%error%',
                PEAR_CHANNELFILE_ERROR_NO_NAME =>
                    'Missing channel name',
                PEAR_CHANNELFILE_ERROR_INVALID_NAME =>
                    'Invalid channel %tag% "%name%"',
                PEAR_CHANNELFILE_ERROR_NO_SUMMARY =>
                    'Missing channel summary',
                PEAR_CHANNELFILE_ERROR_MULTILINE_SUMMARY =>
                    'Channel summary should be on one line, but is multi-line',
                PEAR_CHANNELFILE_ERROR_NO_HOST =>
                    'Missing channel server for %type% server',
                PEAR_CHANNELFILE_ERROR_INVALID_HOST =>
                    'Server name "%server%" is invalid for %type% server',
                PEAR_CHANNELFILE_ERROR_INVALID_MIRROR =>
                    'Invalid mirror name "%name%", mirror type %type%',
                PEAR_CHANNELFILE_ERROR_INVALID_MIRRORTYPE =>
                    'Invalid mirror type "%type%"',
                PEAR_CHANNELFILE_ERROR_INVALID =>
                    'Cannot generate xml, contents are invalid',
                PEAR_CHANNELFILE_ERROR_EMPTY_REGEX =>
                    'packagenameregex cannot be empty',
                PEAR_CHANNELFILE_ERROR_NO_FUNCTIONVERSION =>
                    '%parent% %protocol% function has no version',
                PEAR_CHANNELFILE_ERROR_NO_FUNCTIONNAME =>
                    '%parent% %protocol% function has no name',
                PEAR_CHANNELFILE_ERROR_NOBASEURLTYPE =>
                    '%parent% rest baseurl has no type',
                PEAR_CHANNELFILE_ERROR_NOVALIDATE_NAME =>
                    'Validation package has no name in <validatepackage> tag',
                PEAR_CHANNELFILE_ERROR_NOVALIDATE_VERSION =>
                    'Validation package "%package%" has no version',
                PEAR_CHANNELFILE_ERROR_MIRROR_NOT_FOUND =>
                    'Mirror "%mirror%" does not exist',
                PEAR_CHANNELFILE_ERROR_INVALID_PORT =>
                    'Port "%port%" must be numeric',
                PEAR_CHANNELFILE_ERROR_NO_STATICVERSION =>
                    '<static> tag must contain version attribute',
                PEAR_CHANNELFILE_URI_CANT_MIRROR =>
                    'The __uri pseudo-channel cannot have mirrors',
                PEAR_CHANNELFILE_ERROR_INVALID_SSL =>
                    '%server% has invalid ssl attribute "%ssl%" can only be yes or not present',
            );
    }

    /**
     * @param string contents of package.xml file
     * @return bool success of parsing
     */
    function fromXmlString($data)
    {
        if (preg_match('/<channel\s+version="([0-9]+\.[0-9]+)"/', $data, $channelversion)) {
            if (!in_array($channelversion[1], $this->_supportedVersions)) {
                $this->_stack->push(PEAR_CHANNELFILE_ERROR_INVALID_VERSION, 'error',
                    array('version' => $channelversion[1]));
                return false;
            }
            $parser = new PEAR_XMLParser;
            $result = $parser->parse($data);
            if ($result !== true) {
                if ($result->getCode() == 1) {
                    $this->_stack->push(PEAR_CHANNELFILE_ERROR_NO_XML_EXT, 'error',
                        array('error' => $result->getMessage()));
                } else {
                    $this->_stack->push(PEAR_CHANNELFILE_ERROR_CANT_MAKE_PARSER, 'error');
                }
                return false;
            }
            $this->_channelInfo = $parser->getData();
            return true;
        } else {
            $this->_stack->push(PEAR_CHANNELFILE_ERROR_NO_VERSION, 'error', array('xml' => $data));
            return false;
        }
    }

    /**
     * @return array
     */
    function toArray()
    {
        if (!$this->_isValid && !$this->validate()) {
            return false;
        }
        return $this->_channelInfo;
    }

    /**
     * @param array
     *
     * @return PEAR_ChannelFile|false false if invalid
     */
    public static function &fromArray(
        $data, $compatibility = false, $stackClass = 'PEAR_ErrorStack'
    ) {
        $a = new PEAR_ChannelFile($compatibility, $stackClass);
        $a->_fromArray($data);
        if (!$a->validate()) {
            $a = false;
            return $a;
        }
        return $a;
    }

    /**
     * Unlike {@link fromArray()} this does not do any validation
     *
     * @param array
     *
     * @return PEAR_ChannelFile
     */
    public static function &fromArrayWithErrors(
        $data, $compatibility = false, $stackClass = 'PEAR_ErrorStack'
    ) {
        $a = new PEAR_ChannelFile($compatibility, $stackClass);
        $a->_fromArray($data);
        return $a;
    }

    /**
     * @param array
     * @access private
     */
    function _fromArray($data)
    {
        $this->_channelInfo = $data;
    }

    /**
     * Wrapper to {@link PEAR_ErrorStack::getErrors()}
     * @param boolean determines whether to purge the error stack after retrieving
     * @return array
     */
    function getErrors($purge = false)
    {
        return $this->_stack->getErrors($purge);
    }

    /**
     * Unindent given string (?)
     *
     * @param string $str The string that has to be unindented.
     * @return string
     * @access private
     */
    function _unIndent($str)
    {
        // remove leading newlines
        $str = preg_replace('/^[\r\n]+/', '', $str);
        // find whitespace at the beginning of the first line
        $indent_len = strspn($str, " \t");
        $indent = substr($str, 0, $indent_len);
        $data = '';
        // remove the same amount of whitespace from following lines
        foreach (explode("\n", $str) as $line) {
            if (substr($line, 0, $indent_len) == $indent) {
                $data .= substr($line, $indent_len) . "\n";
            }
        }
        return $data;
    }

    /**
     * Parse a channel.xml file.  Expects the name of
     * a channel xml file as input.
     *
     * @param string  $descfile  name of channel xml file
     * @return bool success of parsing
     */
    function fromXmlFile($descfile)
    {
        if (!file_exists($descfile) || !is_file($descfile) || !is_readable($descfile) ||
             (!$fp = fopen($descfile, 'r'))) {
            require_once 'PEAR.php';
            return PEAR::raiseError("Unable to open $descfile");
        }

        // read the whole thing so we only get one cdata callback
        // for each block of cdata
        fclose($fp);
        $data = file_get_contents($descfile);
        return $this->fromXmlString($data);
    }

    /**
     * Parse channel information from different sources
     *
     * This method is able to extract information about a channel
     * from an .xml file or a string
     *
     * @access public
     * @param  string Filename of the source or the source itself
     * @return bool
     */
    function fromAny($info)
    {
        if (is_string($info) && file_exists($info) && strlen($info) < 255) {
            $tmp = substr($info, -4);
            if ($tmp == '.xml') {
                $info = $this->fromXmlFile($info);
            } else {
                $fp = fopen($info, "r");
                $test = fread($fp, 5);
                fclose($fp);
                if ($test == "<?xml") {
                    $info = $this->fromXmlFile($info);
                }
            }
            if (PEAR::isError($info)) {
                require_once 'PEAR.php';
                return PEAR::raiseError($info);
            }
        }
        if (is_string($info)) {
            $info = $this->fromXmlString($info);
        }
        return $info;
    }

    /**
     * Return an XML document based on previous parsing and modifications
     *
     * @return string XML data
     *
     * @access public
     */
    function toXml()
    {
        if (!$this->_isValid && !$this->validate()) {
            $this->_validateError(PEAR_CHANNELFILE_ERROR_INVALID);
            return false;
        }
        if (!isset($this->_channelInfo['attribs']['version'])) {
            $this->_channelInfo['attribs']['version'] = '1.0';
        }
        $channelInfo = $this->_channelInfo;
        $ret = "<?xml version=\"1.0\" encoding=\"ISO-8859-1\" ?>\n";
        $ret .= "<channel version=\"" .
            $channelInfo['attribs']['version'] . "\" xmlns=\"http://pear.php.net/channel-1.0\"
  xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\"
  xsi:schemaLocation=\"http://pear.php.net/dtd/channel-"
            . $channelInfo['attribs']['version'] . " http://pear.php.net/dtd/channel-" .
            $channelInfo['attribs']['version'] . ".xsd\">
 <name>$channelInfo[name]</name>
 <summary>" . htmlspecialchars($channelInfo['summary'])."</summary>
";
        if (isset($channelInfo['suggestedalias'])) {
            $ret .= ' <suggestedalias>' . $channelInfo['suggestedalias'] . "</suggestedalias>\n";
        }
        if (isset($channelInfo['validatepackage'])) {
            $ret .= ' <validatepackage version="' .
                $channelInfo['validatepackage']['attribs']['version']. '">' .
                htmlspecialchars($channelInfo['validatepackage']['_content']) .
                "</validatepackage>\n";
        }
        $ret .= " <servers>\n";
        $ret .= '  <primary';
        if (isset($channelInfo['servers']['primary']['attribs']['ssl'])) {
            $ret .= ' ssl="' . $channelInfo['servers']['primary']['attribs']['ssl'] . '"';
        }
        if (isset($channelInfo['servers']['primary']['attribs']['port'])) {
            $ret .= ' port="' . $channelInfo['servers']['primary']['attribs']['port'] . '"';
        }
        $ret .= ">\n";
        if (isset($channelInfo['servers']['primary']['rest'])) {
            $ret .= $this->_makeRestXml($channelInfo['servers']['primary']['rest'], '   ');
        }
        $ret .= "  </primary>\n";
        if (isset($channelInfo['servers']['mirror'])) {
            $ret .= $this->_makeMirrorsXml($channelInfo);
        }
        $ret .= " </servers>\n";
        $ret .= "</channel>";
        return str_replace("\r", "\n", str_replace("\r\n", "\n", $ret));
    }

    /**
     * Generate the <rest> tag
     * @access private
     */
    function _makeRestXml($info, $indent)
    {
        $ret = $indent . "<rest>\n";
        if (isset($info['baseurl']) && !isset($info['baseurl'][0])) {
            $info['baseurl'] = array($info['baseurl']);
        }

        if (isset($info['baseurl'])) {
            foreach ($info['baseurl'] as $url) {
                $ret .= "$indent <baseurl type=\"" . $url['attribs']['type'] . "\"";
                $ret .= ">" . $url['_content'] . "</baseurl>\n";
            }
        }
        $ret .= $indent . "</rest>\n";
        return $ret;
    }

    /**
     * Generate the <mirrors> tag
     * @access private
     */
    function _makeMirrorsXml($channelInfo)
    {
        $ret = "";
        if (!isset($channelInfo['servers']['mirror'][0])) {
            $channelInfo['servers']['mirror'] = array($channelInfo['servers']['mirror']);
        }
        foreach ($channelInfo['servers']['mirror'] as $mirror) {
            $ret .= '  <mirror host="' . $mirror['attribs']['host'] . '"';
            if (isset($mirror['attribs']['port'])) {
                $ret .= ' port="' . $mirror['attribs']['port'] . '"';
            }
            if (isset($mirror['attribs']['ssl'])) {
                $ret .= ' ssl="' . $mirror['attribs']['ssl'] . '"';
            }
            $ret .= ">\n";
            if (isset($mirror['rest'])) {
                if (isset($mirror['rest'])) {
                    $ret .= $this->_makeRestXml($mirror['rest'], '   ');
                }
                $ret .= "  </mirror>\n";
            } else {
                $ret .= "/>\n";
            }
        }
        return $ret;
    }

    /**
     * Generate the <functions> tag
     * @access private
     */
    function _makeFunctionsXml($functions, $indent, $rest = false)
    {
        $ret = '';
        if (!isset($functions[0])) {
            $functions = array($functions);
        }
        foreach ($functions as $function) {
            $ret .= "$indent<function version=\"" . $function['attribs']['version'] . "\"";
            if ($rest) {
                $ret .= ' uri="' . $function['attribs']['uri'] . '"';
            }
            $ret .= ">" . $function['_content'] . "</function>\n";
        }
        return $ret;
    }

    /**
     * Validation error.  Also marks the object contents as invalid
     * @param error code
     * @param array error information
     * @access private
     */
    function _validateError($code, $params = array())
    {
        $this->_stack->push($code, 'error', $params);
        $this->_isValid = false;
    }

    /**
     * Validation warning.  Does not mark the object contents invalid.
     * @param error code
     * @param array error information
     * @access private
     */
    function _validateWarning($code, $params = array())
    {
        $this->_stack->push($code, 'warning', $params);
    }

    /**
     * Validate parsed file.
     *
     * @access public
     * @return boolean
     */
    function validate()
    {
        $this->_isValid = true;
        $info = $this->_channelInfo;
        if (empty($info['name'])) {
            $this->_validateError(PEAR_CHANNELFILE_ERROR_NO_NAME);
        } elseif (!$this->validChannelServer($info['name'])) {
            if ($info['name'] != '__uri') {
                $this->_validateError(PEAR_CHANNELFILE_ERROR_INVALID_NAME, array('tag' => 'name',
                    'name' => $info['name']));
            }
        }
        if (empty($info['summary'])) {
            $this->_validateError(PEAR_CHANNELFILE_ERROR_NO_SUMMARY);
        } elseif (strpos(trim($info['summary']), "\n") !== false) {
            $this->_validateWarning(PEAR_CHANNELFILE_ERROR_MULTILINE_SUMMARY,
                array('summary' => $info['summary']));
        }
        if (isset($info['suggestedalias'])) {
            if (!$this->validChannelServer($info['suggestedalias'])) {
                $this->_validateError(PEAR_CHANNELFILE_ERROR_INVALID_NAME,
                    array('tag' => 'suggestedalias', 'name' =>$info['suggestedalias']));
            }
        }
        if (isset($info['localalias'])) {
            if (!$this->validChannelServer($info['localalias'])) {
                $this->_validateError(PEAR_CHANNELFILE_ERROR_INVALID_NAME,
                    array('tag' => 'localalias', 'name' =>$info['localalias']));
            }
        }
        if (isset($info['validatepackage'])) {
            if (!isset($info['validatepackage']['_content'])) {
                $this->_validateError(PEAR_CHANNELFILE_ERROR_NOVALIDATE_NAME);
            }
            if (!isset($info['validatepackage']['attribs']['version'])) {
                $content = isset($info['validatepackage']['_content']) ?
                    $info['validatepackage']['_content'] :
                    null;
                $this->_validateError(PEAR_CHANNELFILE_ERROR_NOVALIDATE_VERSION,
                    array('package' => $content));
            }
        }

        if (isset($info['servers']['primary']['attribs'], $info['servers']['primary']['attribs']['port']) &&
              !is_numeric($info['servers']['primary']['attribs']['port'])) {
            $this->_validateError(PEAR_CHANNELFILE_ERROR_INVALID_PORT,
                array('port' => $info['servers']['primary']['attribs']['port']));
        }

        if (isset($info['servers']['primary']['attribs'], $info['servers']['primary']['attribs']['ssl']) &&
              $info['servers']['primary']['attribs']['ssl'] != 'yes') {
            $this->_validateError(PEAR_CHANNELFILE_ERROR_INVALID_SSL,
                array('ssl' => $info['servers']['primary']['attribs']['ssl'],
                    'server' => $info['name']));
        }

        if (isset($info['servers']['primary']['rest']) &&
              isset($info['servers']['primary']['rest']['baseurl'])) {
            $this->_validateFunctions('rest', $info['servers']['primary']['rest']['baseurl']);
        }
        if (isset($info['servers']['mirror'])) {
            if ($this->_channelInfo['name'] == '__uri') {
                $this->_validateError(PEAR_CHANNELFILE_URI_CANT_MIRROR);
            }
            if (!isset($info['servers']['mirror'][0])) {
                $info['servers']['mirror'] = array($info['servers']['mirror']);
            }
            foreach ($info['servers']['mirror'] as $mirror) {
                if (!isset($mirror['attribs']['host'])) {
                    $this->_validateError(PEAR_CHANNELFILE_ERROR_NO_HOST,
                      array('type' => 'mirror'));
                } elseif (!$this->validChannelServer($mirror['attribs']['host'])) {
                    $this->_validateError(PEAR_CHANNELFILE_ERROR_INVALID_HOST,
                        array('server' => $mirror['attribs']['host'], 'type' => 'mirror'));
                }
                if (isset($mirror['attribs']['ssl']) && $mirror['attribs']['ssl'] != 'yes') {
                    $this->_validateError(PEAR_CHANNELFILE_ERROR_INVALID_SSL,
                        array('ssl' => $info['ssl'], 'server' => $mirror['attribs']['host']));
                }
                if (isset($mirror['rest'])) {
                    $this->_validateFunctions('rest', $mirror['rest']['baseurl'],
                        $mirror['attribs']['host']);
                }
            }
        }
        return $this->_isValid;
    }

    /**
     * @param string  rest - protocol name this function applies to
     * @param array the functions
     * @param string the name of the parent element (mirror name, for instance)
     */
    function _validateFunctions($protocol, $functions, $parent = '')
    {
        if (!isset($functions[0])) {
            $functions = array($functions);
        }

        foreach ($functions as $function) {
            if (!isset($function['_content']) || empty($function['_content'])) {
                $this->_validateError(PEAR_CHANNELFILE_ERROR_NO_FUNCTIONNAME,
                    array('parent' => $parent, 'protocol' => $protocol));
            }

            if ($protocol == 'rest') {
                if (!isset($function['attribs']['type']) ||
                      empty($function['attribs']['type'])) {
                    $this->_validateError(PEAR_CHANNELFILE_ERROR_NOBASEURLTYPE,
                        array('parent' => $parent, 'protocol' => $protocol));
                }
            } else {
                if (!isset($function['attribs']['version']) ||
                      empty($function['attribs']['version'])) {
                    $this->_validateError(PEAR_CHANNELFILE_ERROR_NO_FUNCTIONVERSION,
                        array('parent' => $parent, 'protocol' => $protocol));
                }
            }
        }
    }

    /**
     * Test whether a string contains a valid channel server.
     * @param string $ver the package version to test
     * @return bool
     */
    function validChannelServer($server)
    {
        if ($server == '__uri') {
            return true;
        }
        return (bool) preg_match(PEAR_CHANNELS_SERVER_PREG, $server);
    }

    /**
     * @return string|false
     */
    function getName()
    {
        if (isset($this->_channelInfo['name'])) {
            return $this->_channelInfo['name'];
        }

        return false;
    }

    /**
     * @return string|false
     */
    function getServer()
    {
        if (isset($this->_channelInfo['name'])) {
            return $this->_channelInfo['name'];
        }

        return false;
    }

    /**
     * @return int|80 port number to connect to
     */
    function getPort($mirror = false)
    {
        if ($mirror) {
            if ($mir = $this->getMirror($mirror)) {
                if (isset($mir['attribs']['port'])) {
                    return $mir['attribs']['port'];
                }

                if ($this->getSSL($mirror)) {
                    return 443;
                }

                return 80;
            }

            return false;
        }

        if (isset($this->_channelInfo['servers']['primary']['attribs']['port'])) {
            return $this->_channelInfo['servers']['primary']['attribs']['port'];
        }

        if ($this->getSSL()) {
            return 443;
        }

        return 80;
    }

    /**
     * @return bool Determines whether secure sockets layer (SSL) is used to connect to this channel
     */
    function getSSL($mirror = false)
    {
        if ($mirror) {
            if ($mir = $this->getMirror($mirror)) {
                if (isset($mir['attribs']['ssl'])) {
                    return true;
                }

                return false;
            }

            return false;
        }

        if (isset($this->_channelInfo['servers']['primary']['attribs']['ssl'])) {
            return true;
        }

        return false;
    }

    /**
     * @return string|false
     */
    function getSummary()
    {
        if (isset($this->_channelInfo['summary'])) {
            return $this->_channelInfo['summary'];
        }

        return false;
    }

    /**
     * @param string protocol type
     * @param string Mirror name
     * @return array|false
     */
    function getFunctions($protocol, $mirror = false)
    {
        if ($this->getName() == '__uri') {
            return false;
        }

        $function = $protocol == 'rest' ? 'baseurl' : 'function';
        if ($mirror) {
            if ($mir = $this->getMirror($mirror)) {
                if (isset($mir[$protocol][$function])) {
                    return $mir[$protocol][$function];
                }
            }

            return false;
        }

        if (isset($this->_channelInfo['servers']['primary'][$protocol][$function])) {
            return $this->_channelInfo['servers']['primary'][$protocol][$function];
        }

        return false;
    }

    /**
     * @param string Protocol type
     * @param string Function name (null to return the
     *               first protocol of the type requested)
     * @param string Mirror name, if any
     * @return array
     */
     function getFunction($type, $name = null, $mirror = false)
     {
        $protocols = $this->getFunctions($type, $mirror);
        if (!$protocols) {
            return false;
        }

        foreach ($protocols as $protocol) {
            if ($name === null) {
                return $protocol;
            }

            if ($protocol['_content'] != $name) {
                continue;
            }

            return $protocol;
        }

        return false;
     }

    /**
     * @param string protocol type
     * @param string protocol name
     * @param string version
     * @param string mirror name
     * @return boolean
     */
    function supports($type, $name = null, $mirror = false, $version = '1.0')
    {
        $protocols = $this->getFunctions($type, $mirror);
        if (!$protocols) {
            return false;
        }

        foreach ($protocols as $protocol) {
            if ($protocol['attribs']['version'] != $version) {
                continue;
            }

            if ($name === null) {
                return true;
            }

            if ($protocol['_content'] != $name) {
                continue;
            }

            return true;
        }

        return false;
    }

    /**
     * Determines whether a channel supports Representational State Transfer (REST) protocols
     * for retrieving channel information
     * @param string
     * @return bool
     */
    function supportsREST($mirror = false)
    {
        if ($mirror == $this->_channelInfo['name']) {
            $mirror = false;
        }

        if ($mirror) {
            if ($mir = $this->getMirror($mirror)) {
                return isset($mir['rest']);
            }

            return false;
        }

        return isset($this->_channelInfo['servers']['primary']['rest']);
    }

    /**
     * Get the URL to access a base resource.
     *
     * Hyperlinks in the returned xml will be used to retrieve the proper information
     * needed.  This allows extreme extensibility and flexibility in implementation
     * @param string Resource Type to retrieve
     */
    function getBaseURL($resourceType, $mirror = false)
    {
        if ($mirror == $this->_channelInfo['name']) {
            $mirror = false;
        }

        if ($mirror) {
            $mir = $this->getMirror($mirror);
            if (!$mir) {
                return false;
            }

            $rest = $mir['rest'];
        } else {
            $rest = $this->_channelInfo['servers']['primary']['rest'];
        }

        if (!isset($rest['baseurl'][0])) {
            $rest['baseurl'] = array($rest['baseurl']);
        }

        foreach ($rest['baseurl'] as $baseurl) {
            if (strtolower($baseurl['attribs']['type']) == strtolower($resourceType)) {
                return $baseurl['_content'];
            }
        }

        return false;
    }

    /**
     * Since REST does not implement RPC, provide this as a logical wrapper around
     * resetFunctions for REST
     * @param string|false mirror name, if any
     */
    function resetREST($mirror = false)
    {
        return $this->resetFunctions('rest', $mirror);
    }

    /**
     * Empty all protocol definitions
     * @param string protocol type
     * @param string|false mirror name, if any
     */
    function resetFunctions($type, $mirror = false)
    {
        if ($mirror) {
            if (isset($this->_channelInfo['servers']['mirror'])) {
                $mirrors = $this->_channelInfo['servers']['mirror'];
                if (!isset($mirrors[0])) {
                    $mirrors = array($mirrors);
                }

                foreach ($mirrors as $i => $mir) {
                    if ($mir['attribs']['host'] == $mirror) {
                        if (isset($this->_channelInfo['servers']['mirror'][$i][$type])) {
                            unset($this->_channelInfo['servers']['mirror'][$i][$type]);
                        }

                        return true;
                    }
                }

                return false;
            }

            return false;
        }

        if (isset($this->_channelInfo['servers']['primary'][$type])) {
            unset($this->_channelInfo['servers']['primary'][$type]);
        }

        return true;
    }

    /**
     * Set a channel's protocols to the protocols supported by pearweb
     */
    function setDefaultPEARProtocols($version = '1.0', $mirror = false)
    {
        switch ($version) {
            case '1.0' :
                $this->resetREST($mirror);

                if (!isset($this->_channelInfo['servers'])) {
                    $this->_channelInfo['servers'] = array('primary' =>
                        array('rest' => array()));
                } elseif (!isset($this->_channelInfo['servers']['primary'])) {
                    $this->_channelInfo['servers']['primary'] = array('rest' => array());
                }

                return true;
            break;
            default :
                return false;
            break;
        }
    }

    /**
     * @return array
     */
    function getMirrors()
    {
        if (isset($this->_channelInfo['servers']['mirror'])) {
            $mirrors = $this->_channelInfo['servers']['mirror'];
            if (!isset($mirrors[0])) {
                $mirrors = array($mirrors);
            }

            return $mirrors;
        }

        return array();
    }

    /**
     * Get the unserialized XML representing a mirror
     * @return array|false
     */
    function getMirror($server)
    {
        foreach ($this->getMirrors() as $mirror) {
            if ($mirror['attribs']['host'] == $server) {
                return $mirror;
            }
        }

        return false;
    }

    /**
     * @param string
     * @return string|false
     * @error PEAR_CHANNELFILE_ERROR_NO_NAME
     * @error PEAR_CHANNELFILE_ERROR_INVALID_NAME
     */
    function setName($name)
    {
        return $this->setServer($name);
    }

    /**
     * Set the socket number (port) that is used to connect to this channel
     * @param integer
     * @param string|false name of the mirror server, or false for the primary
     */
    function setPort($port, $mirror = false)
    {
        if ($mirror) {
            if (!isset($this->_channelInfo['servers']['mirror'])) {
                $this->_validateError(PEAR_CHANNELFILE_ERROR_MIRROR_NOT_FOUND,
                    array('mirror' => $mirror));
                return false;
            }

            if (isset($this->_channelInfo['servers']['mirror'][0])) {
                foreach ($this->_channelInfo['servers']['mirror'] as $i => $mir) {
                    if ($mirror == $mir['attribs']['host']) {
                        $this->_channelInfo['servers']['mirror'][$i]['attribs']['port'] = $port;
                        return true;
                    }
                }

                return false;
            } elseif ($this->_channelInfo['servers']['mirror']['attribs']['host'] == $mirror) {
                $this->_channelInfo['servers']['mirror']['attribs']['port'] = $port;
                $this->_isValid = false;
                return true;
            }
        }

        $this->_channelInfo['servers']['primary']['attribs']['port'] = $port;
        $this->_isValid = false;
        return true;
    }

    /**
     * Set the socket number (port) that is used to connect to this channel
     * @param bool Determines whether to turn on SSL support or turn it off
     * @param string|false name of the mirror server, or false for the primary
     */
    function setSSL($ssl = true, $mirror = false)
    {
        if ($mirror) {
            if (!isset($this->_channelInfo['servers']['mirror'])) {
                $this->_validateError(PEAR_CHANNELFILE_ERROR_MIRROR_NOT_FOUND,
                    array('mirror' => $mirror));
                return false;
            }

            if (isset($this->_channelInfo['servers']['mirror'][0])) {
                foreach ($this->_channelInfo['servers']['mirror'] as $i => $mir) {
                    if ($mirror == $mir['attribs']['host']) {
                        if (!$ssl) {
                            if (isset($this->_channelInfo['servers']['mirror'][$i]
                                  ['attribs']['ssl'])) {
                                unset($this->_channelInfo['servers']['mirror'][$i]['attribs']['ssl']);
                            }
                        } else {
                            $this->_channelInfo['servers']['mirror'][$i]['attribs']['ssl'] = 'yes';
                        }

                        return true;
                    }
                }

                return false;
            } elseif ($this->_channelInfo['servers']['mirror']['attribs']['host'] == $mirror) {
                if (!$ssl) {
                    if (isset($this->_channelInfo['servers']['mirror']['attribs']['ssl'])) {
                        unset($this->_channelInfo['servers']['mirror']['attribs']['ssl']);
                    }
                } else {
                    $this->_channelInfo['servers']['mirror']['attribs']['ssl'] = 'yes';
                }

                $this->_isValid = false;
                return true;
            }
        }

        if ($ssl) {
            $this->_channelInfo['servers']['primary']['attribs']['ssl'] = 'yes';
        } else {
            if (isset($this->_channelInfo['servers']['primary']['attribs']['ssl'])) {
                unset($this->_channelInfo['servers']['primary']['attribs']['ssl']);
            }
        }

        $this->_isValid = false;
        return true;
    }

    /**
     * @param string
     * @return string|false
     * @error PEAR_CHANNELFILE_ERROR_NO_SERVER
     * @error PEAR_CHANNELFILE_ERROR_INVALID_SERVER
     */
    function setServer($server, $mirror = false)
    {
        if (empty($server)) {
            $this->_validateError(PEAR_CHANNELFILE_ERROR_NO_SERVER);
            return false;
        } elseif (!$this->validChannelServer($server)) {
            $this->_validateError(PEAR_CHANNELFILE_ERROR_INVALID_NAME,
                array('tag' => 'name', 'name' => $server));
            return false;
        }

        if ($mirror) {
            $found = false;
            foreach ($this->_channelInfo['servers']['mirror'] as $i => $mir) {
                if ($mirror == $mir['attribs']['host']) {
                    $found = true;
                    break;
                }
            }

            if (!$found) {
                $this->_validateError(PEAR_CHANNELFILE_ERROR_MIRROR_NOT_FOUND,
                    array('mirror' => $mirror));
                return false;
            }

            $this->_channelInfo['mirror'][$i]['attribs']['host'] = $server;
            return true;
        }

        $this->_channelInfo['name'] = $server;
        return true;
    }

    /**
     * @param string
     * @return boolean success
     * @error PEAR_CHANNELFILE_ERROR_NO_SUMMARY
     * @warning PEAR_CHANNELFILE_ERROR_MULTILINE_SUMMARY
     */
    function setSummary($summary)
    {
        if (empty($summary)) {
            $this->_validateError(PEAR_CHANNELFILE_ERROR_NO_SUMMARY);
            return false;
        } elseif (strpos(trim($summary), "\n") !== false) {
            $this->_validateWarning(PEAR_CHANNELFILE_ERROR_MULTILINE_SUMMARY,
                array('summary' => $summary));
        }

        $this->_channelInfo['summary'] = $summary;
        return true;
    }

    /**
     * @param string
     * @param boolean determines whether the alias is in channel.xml or local
     * @return boolean success
     */
    function setAlias($alias, $local = false)
    {
        if (!$this->validChannelServer($alias)) {
            $this->_validateError(PEAR_CHANNELFILE_ERROR_INVALID_NAME,
                array('tag' => 'suggestedalias', 'name' => $alias));
            return false;
        }

        if ($local) {
            $this->_channelInfo['localalias'] = $alias;
        } else {
            $this->_channelInfo['suggestedalias'] = $alias;
        }

        return true;
    }

    /**
     * @return string
     */
    function getAlias()
    {
        if (isset($this->_channelInfo['localalias'])) {
            return $this->_channelInfo['localalias'];
        }
        if (isset($this->_channelInfo['suggestedalias'])) {
            return $this->_channelInfo['suggestedalias'];
        }
        if (isset($this->_channelInfo['name'])) {
            return $this->_channelInfo['name'];
        }
        return '';
    }

    /**
     * Set the package validation object if it differs from PEAR's default
     * The class must be includeable via changing _ in the classname to path separator,
     * but no checking of this is made.
     * @param string|false pass in false to reset to the default packagename regex
     * @return boolean success
     */
    function setValidationPackage($validateclass, $version)
    {
        if (empty($validateclass)) {
            unset($this->_channelInfo['validatepackage']);
        }
        $this->_channelInfo['validatepackage'] = array('_content' => $validateclass);
        $this->_channelInfo['validatepackage']['attribs'] = array('version' => $version);
    }

    /**
     * Add a protocol to the provides section
     * @param string protocol type
     * @param string protocol version
     * @param string protocol name, if any
     * @param string mirror name, if this is a mirror's protocol
     * @return bool
     */
    function addFunction($type, $version, $name = '', $mirror = false)
    {
        if ($mirror) {
            return $this->addMirrorFunction($mirror, $type, $version, $name);
        }

        $set = array('attribs' => array('version' => $version), '_content' => $name);
        if (!isset($this->_channelInfo['servers']['primary'][$type]['function'])) {
            if (!isset($this->_channelInfo['servers'])) {
                $this->_channelInfo['servers'] = array('primary' =>
                    array($type => array()));
            } elseif (!isset($this->_channelInfo['servers']['primary'])) {
                $this->_channelInfo['servers']['primary'] = array($type => array());
            }

            $this->_channelInfo['servers']['primary'][$type]['function'] = $set;
            $this->_isValid = false;
            return true;
        } elseif (!isset($this->_channelInfo['servers']['primary'][$type]['function'][0])) {
            $this->_channelInfo['servers']['primary'][$type]['function'] = array(
                $this->_channelInfo['servers']['primary'][$type]['function']);
        }

        $this->_channelInfo['servers']['primary'][$type]['function'][] = $set;
        return true;
    }
    /**
     * Add a protocol to a mirror's provides section
     * @param string mirror name (server)
     * @param string protocol type
     * @param string protocol version
     * @param string protocol name, if any
     */
    function addMirrorFunction($mirror, $type, $version, $name = '')
    {
        if (!isset($this->_channelInfo['servers']['mirror'])) {
            $this->_validateError(PEAR_CHANNELFILE_ERROR_MIRROR_NOT_FOUND,
                array('mirror' => $mirror));
            return false;
        }

        $setmirror = false;
        if (isset($this->_channelInfo['servers']['mirror'][0])) {
            foreach ($this->_channelInfo['servers']['mirror'] as $i => $mir) {
                if ($mirror == $mir['attribs']['host']) {
                    $setmirror = &$this->_channelInfo['servers']['mirror'][$i];
                    break;
                }
            }
        } else {
            if ($this->_channelInfo['servers']['mirror']['attribs']['host'] == $mirror) {
                $setmirror = &$this->_channelInfo['servers']['mirror'];
            }
        }

        if (!$setmirror) {
            $this->_validateError(PEAR_CHANNELFILE_ERROR_MIRROR_NOT_FOUND,
                array('mirror' => $mirror));
            return false;
        }

        $set = array('attribs' => array('version' => $version), '_content' => $name);
        if (!isset($setmirror[$type]['function'])) {
            $setmirror[$type]['function'] = $set;
            $this->_isValid = false;
            return true;
        } elseif (!isset($setmirror[$type]['function'][0])) {
            $setmirror[$type]['function'] = array($setmirror[$type]['function']);
        }

        $setmirror[$type]['function'][] = $set;
        $this->_isValid = false;
        return true;
    }

    /**
     * @param string Resource Type this url links to
     * @param string URL
     * @param string|false mirror name, if this is not a primary server REST base URL
     */
    function setBaseURL($resourceType, $url, $mirror = false)
    {
        if ($mirror) {
            if (!isset($this->_channelInfo['servers']['mirror'])) {
                $this->_validateError(PEAR_CHANNELFILE_ERROR_MIRROR_NOT_FOUND,
                    array('mirror' => $mirror));
                return false;
            }

            $setmirror = false;
            if (isset($this->_channelInfo['servers']['mirror'][0])) {
                foreach ($this->_channelInfo['servers']['mirror'] as $i => $mir) {
                    if ($mirror == $mir['attribs']['host']) {
                        $setmirror = &$this->_channelInfo['servers']['mirror'][$i];
                        break;
                    }
                }
            } else {
                if ($this->_channelInfo['servers']['mirror']['attribs']['host'] == $mirror) {
                    $setmirror = &$this->_channelInfo['servers']['mirror'];
                }
            }
        } else {
            $setmirror = &$this->_channelInfo['servers']['primary'];
        }

        $set = array('attribs' => array('type' => $resourceType), '_content' => $url);
        if (!isset($setmirror['rest'])) {
            $setmirror['rest'] = array();
        }

        if (!isset($setmirror['rest']['baseurl'])) {
            $setmirror['rest']['baseurl'] = $set;
            $this->_isValid = false;
            return true;
        } elseif (!isset($setmirror['rest']['baseurl'][0])) {
            $setmirror['rest']['baseurl'] = array($setmirror['rest']['baseurl']);
        }

        foreach ($setmirror['rest']['baseurl'] as $i => $url) {
            if ($url['attribs']['type'] == $resourceType) {
                $this->_isValid = false;
                $setmirror['rest']['baseurl'][$i] = $set;
                return true;
            }
        }

        $setmirror['rest']['baseurl'][] = $set;
        $this->_isValid = false;
        return true;
    }

    /**
     * @param string mirror server
     * @param int mirror http port
     * @return boolean
     */
    function addMirror($server, $port = null)
    {
        if ($this->_channelInfo['name'] == '__uri') {
            return false; // the __uri channel cannot have mirrors by definition
        }

        $set = array('attribs' => array('host' => $server));
        if (is_numeric($port)) {
            $set['attribs']['port'] = $port;
        }

        if (!isset($this->_channelInfo['servers']['mirror'])) {
            $this->_channelInfo['servers']['mirror'] = $set;
            return true;
        }

        if (!isset($this->_channelInfo['servers']['mirror'][0])) {
            $this->_channelInfo['servers']['mirror'] =
                array($this->_channelInfo['servers']['mirror']);
        }

        $this->_channelInfo['servers']['mirror'][] = $set;
        return true;
    }

    /**
     * Retrieve the name of the validation package for this channel
     * @return string|false
     */
    function getValidationPackage()
    {
        if (!$this->_isValid && !$this->validate()) {
            return false;
        }

        if (!isset($this->_channelInfo['validatepackage'])) {
            return array('attribs' => array('version' => 'default'),
                '_content' => 'PEAR_Validate');
        }

        return $this->_channelInfo['validatepackage'];
    }

    /**
     * Retrieve the object that can be used for custom validation
     * @param string|false the name of the package to validate.  If the package is
     *                     the channel validation package, PEAR_Validate is returned
     * @return PEAR_Validate|false false is returned if the validation package
     *         cannot be located
     */
    function &getValidationObject($package = false)
    {
        if (!class_exists('PEAR_Validate')) {
            require_once 'PEAR/Validate.php';
        }

        if (!$this->_isValid) {
            if (!$this->validate()) {
                $a = false;
                return $a;
            }
        }

        if (isset($this->_channelInfo['validatepackage'])) {
            if ($package == $this->_channelInfo['validatepackage']) {
                // channel validation packages are always validated by PEAR_Validate
                $val = new PEAR_Validate;
                return $val;
            }

            if (!class_exists(str_replace('.', '_',
                  $this->_channelInfo['validatepackage']['_content']))) {
                if ($this->isIncludeable(str_replace('_', '/',
                      $this->_channelInfo['validatepackage']['_content']) . '.php')) {
                    include_once str_replace('_', '/',
                        $this->_channelInfo['validatepackage']['_content']) . '.php';
                    $vclass = str_replace('.', '_',
                        $this->_channelInfo['validatepackage']['_content']);
                    $val = new $vclass;
                } else {
                    $a = false;
                    return $a;
                }
            } else {
                $vclass = str_replace('.', '_',
                    $this->_channelInfo['validatepackage']['_content']);
                $val = new $vclass;
            }
        } else {
            $val = new PEAR_Validate;
        }

        return $val;
    }

    function isIncludeable($path)
    {
        $possibilities = explode(PATH_SEPARATOR, ini_get('include_path'));
        foreach ($possibilities as $dir) {
            if (file_exists($dir . DIRECTORY_SEPARATOR . $path)
                  && is_readable($dir . DIRECTORY_SEPARATOR . $path)) {
                return true;
            }
        }

        return false;
    }

    /**
     * This function is used by the channel updater and retrieves a value set by
     * the registry, or the current time if it has not been set
     * @return string
     */
    function lastModified()
    {
        if (isset($this->_channelInfo['_lastmodified'])) {
            return $this->_channelInfo['_lastmodified'];
        }

        return time();
    }
}
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     <?php
/**
 * PEAR_ChannelFile_Parser for parsing channel.xml
 *
 * PHP versions 4 and 5
 *
 * @category   pear
 * @package    PEAR
 * @author     Greg Beaver <cellog@php.net>
 * @copyright  1997-2009 The Authors
 * @license    http://opensource.org/licenses/bsd-license.php New BSD License
 * @link       http://pear.php.net/package/PEAR
 * @since      File available since Release 1.4.0a1
 */

/**
 * base xml parser class
 */
require_once 'PEAR/XMLParser.php';
require_once 'PEAR/ChannelFile.php';
/**
 * Parser for channel.xml
 * @category   pear
 * @package    PEAR
 * @author     Greg Beaver <cellog@php.net>
 * @copyright  1997-2009 The Authors
 * @license    http://opensource.org/licenses/bsd-license.php New BSD License
 * @version    Release: 1.10.5
 * @link       http://pear.php.net/package/PEAR
 * @since      Class available since Release 1.4.0a1
 */
class PEAR_ChannelFile_Parser extends PEAR_XMLParser
{
    var $_config;
    var $_logger;
    var $_registry;

    function setConfig(&$c)
    {
        $this->_config = &$c;
        $this->_registry = &$c->getRegistry();
    }

    function setLogger(&$l)
    {
        $this->_logger = &$l;
    }

    function parse($data, $file)
    {
        if (PEAR::isError($err = parent::parse($data, $file))) {
            return $err;
        }

        $ret = new PEAR_ChannelFile;
        $ret->setConfig($this->_config);
        if (isset($this->_logger)) {
            $ret->setLogger($this->_logger);
        }

        $ret->fromArray($this->_unserializedData);
        // make sure the filelist is in the easy to read format needed
        $ret->flattenFilelist();
        $ret->setPackagefile($file, $archive);
        return $ret;
    }
}                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     <?php
/**
 * PEAR_Command, command pattern class
 *
 * PHP versions 4 and 5
 *
 * @category   pear
 * @package    PEAR
 * @author     Stig Bakken <ssb@php.net>
 * @author     Greg Beaver <cellog@php.net>
 * @copyright  1997-2009 The Authors
 * @license    http://opensource.org/licenses/bsd-license.php New BSD License
 * @link       http://pear.php.net/package/PEAR
 * @since      File available since Release 0.1
 */

/**
 * Needed for error handling
 */
require_once 'PEAR.php';
require_once 'PEAR/Frontend.php';
require_once 'PEAR/XMLParser.php';

/**
 * List of commands and what classes they are implemented in.
 * @var array command => implementing class
 */
$GLOBALS['_PEAR_Command_commandlist'] = array();

/**
 * List of commands and their descriptions
 * @var array command => description
 */
$GLOBALS['_PEAR_Command_commanddesc'] = array();

/**
 * List of shortcuts to common commands.
 * @var array shortcut => command
 */
$GLOBALS['_PEAR_Command_shortcuts'] = array();

/**
 * Array of command objects
 * @var array class => object
 */
$GLOBALS['_PEAR_Command_objects'] = array();

/**
 * PEAR command class, a simple factory class for administrative
 * commands.
 *
 * How to implement command classes:
 *
 * - The class must be called PEAR_Command_Nnn, installed in the
 *   "PEAR/Common" subdir, with a method called getCommands() that
 *   returns an array of the commands implemented by the class (see
 *   PEAR/Command/Install.php for an example).
 *
 * - The class must implement a run() function that is called with three
 *   params:
 *
 *    (string) command name
 *    (array)  assoc array with options, freely defined by each
 *             command, for example:
 *             array('force' => true)
 *    (array)  list of the other parameters
 *
 *   The run() function returns a PEAR_CommandResponse object.  Use
 *   these methods to get information:
 *
 *    int getStatus()   Returns PEAR_COMMAND_(SUCCESS|FAILURE|PARTIAL)
 *                      *_PARTIAL means that you need to issue at least
 *                      one more command to complete the operation
 *                      (used for example for validation steps).
 *
 *    string getMessage()  Returns a message for the user.  Remember,
 *                         no HTML or other interface-specific markup.
 *
 *   If something unexpected happens, run() returns a PEAR error.
 *
 * - DON'T OUTPUT ANYTHING! Return text for output instead.
 *
 * - DON'T USE HTML! The text you return will be used from both Gtk,
 *   web and command-line interfaces, so for now, keep everything to
 *   plain text.
 *
 * - DON'T USE EXIT OR DIE! Always use pear errors.  From static
 *   classes do PEAR::raiseError(), from other classes do
 *   $this->raiseError().
 * @category   pear
 * @package    PEAR
 * @author     Stig Bakken <ssb@php.net>
 * @author     Greg Beaver <cellog@php.net>
 * @copyright  1997-2009 The Authors
 * @license    http://opensource.org/licenses/bsd-license.php New BSD License
 * @version    Release: 1.10.5
 * @link       http://pear.php.net/package/PEAR
 * @since      Class available since Release 0.1
 */
class PEAR_Command
{
    // {{{ factory()

    /**
     * Get the right object for executing a command.
     *
     * @param string $command The name of the command
     * @param object $config  Instance of PEAR_Config object
     *
     * @return object the command object or a PEAR error
     */
    public static function &factory($command, &$config)
    {
        if (empty($GLOBALS['_PEAR_Command_commandlist'])) {
            PEAR_Command::registerCommands();
        }
        if (isset($GLOBALS['_PEAR_Command_shortcuts'][$command])) {
            $command = $GLOBALS['_PEAR_Command_shortcuts'][$command];
        }
        if (!isset($GLOBALS['_PEAR_Command_commandlist'][$command])) {
            $a = PEAR::raiseError("unknown command `$command'");
            return $a;
        }
        $class = $GLOBALS['_PEAR_Command_commandlist'][$command];
        if (!class_exists($class)) {
            require_once $GLOBALS['_PEAR_Command_objects'][$class];
        }
        if (!class_exists($class)) {
            $a = PEAR::raiseError("unknown command `$command'");
            return $a;
        }
        $ui =& PEAR_Command::getFrontendObject();
        $obj = new $class($ui, $config);
        return $obj;
    }

    // }}}
    // {{{ & getObject()
    public static function &getObject($command)
    {
        $class = $GLOBALS['_PEAR_Command_commandlist'][$command];
        if (!class_exists($class)) {
            require_once $GLOBALS['_PEAR_Command_objects'][$class];
        }
        if (!class_exists($class)) {
            return PEAR::raiseError("unknown command `$command'");
        }
        $ui =& PEAR_Command::getFrontendObject();
        $config = &PEAR_Config::singleton();
        $obj = new $class($ui, $config);
        return $obj;
    }

    // }}}
    // {{{ & getFrontendObject()

    /**
     * Get instance of frontend object.
     *
     * @return object|PEAR_Error
     */
    public static function &getFrontendObject()
    {
        $a = &PEAR_Frontend::singleton();
        return $a;
    }

    // }}}
    // {{{ & setFrontendClass()

    /**
     * Load current frontend class.
     *
     * @param string $uiclass Name of class implementing the frontend
     *
     * @return object the frontend object, or a PEAR error
     */
    public static function &setFrontendClass($uiclass)
    {
        $a = &PEAR_Frontend::setFrontendClass($uiclass);
        return $a;
    }

    // }}}
    // {{{ setFrontendType()

    /**
     * Set current frontend.
     *
     * @param string $uitype Name of the frontend type (for example "CLI")
     *
     * @return object the frontend object, or a PEAR error
     */
    public static function setFrontendType($uitype)
    {
        $uiclass = 'PEAR_Frontend_' . $uitype;
        return PEAR_Command::setFrontendClass($uiclass);
    }

    // }}}
    // {{{ registerCommands()

    /**
     * Scan through the Command directory looking for classes
     * and see what commands they implement.
     *
     * @param bool   (optional) if FALSE (default), the new list of
     *               commands should replace the current one.  If TRUE,
     *               new entries will be merged with old.
     *
     * @param string (optional) where (what directory) to look for
     *               classes, defaults to the Command subdirectory of
     *               the directory from where this file (__FILE__) is
     *               included.
     *
     * @return bool TRUE on success, a PEAR error on failure
     */
    public static function registerCommands($merge = false, $dir = null)
    {
        $parser = new PEAR_XMLParser;
        if ($dir === null) {
            $dir = dirname(__FILE__) . '/Command';
        }
        if (!is_dir($dir)) {
            return PEAR::raiseError("registerCommands: opendir($dir) '$dir' does not exist or is not a directory");
        }
        $dp = @opendir($dir);
        if (empty($dp)) {
            return PEAR::raiseError("registerCommands: opendir($dir) failed");
        }
        if (!$merge) {
            $GLOBALS['_PEAR_Command_commandlist'] = array();
        }

        while ($file = readdir($dp)) {
            if ($file{0} == '.' || substr($file, -4) != '.xml') {
                continue;
            }

            $f = substr($file, 0, -4);
            $class = "PEAR_Command_" . $f;
            // List of commands
            if (empty($GLOBALS['_PEAR_Command_objects'][$class])) {
                $GLOBALS['_PEAR_Command_objects'][$class] = "$dir/" . $f . '.php';
            }

            $parser->parse(file_get_contents("$dir/$file"));
            $implements = $parser->getData();
            foreach ($implements as $command => $desc) {
                if ($command == 'attribs') {
                    continue;
                }

                if (isset($GLOBALS['_PEAR_Command_commandlist'][$command])) {
                    return PEAR::raiseError('Command "' . $command . '" already registered in ' .
                        'class "' . $GLOBALS['_PEAR_Command_commandlist'][$command] . '"');
                }

                $GLOBALS['_PEAR_Command_commandlist'][$command] = $class;
                $GLOBALS['_PEAR_Command_commanddesc'][$command] = $desc['summary'];
                if (isset($desc['shortcut'])) {
                    $shortcut = $desc['shortcut'];
                    if (isset($GLOBALS['_PEAR_Command_shortcuts'][$shortcut])) {
                        return PEAR::raiseError('Command shortcut "' . $shortcut . '" already ' .
                            'registered to command "' . $command . '" in class "' .
                            $GLOBALS['_PEAR_Command_commandlist'][$command] . '"');
                    }
                    $GLOBALS['_PEAR_Command_shortcuts'][$shortcut] = $command;
                }

                if (isset($desc['options']) && $desc['options']) {
                    foreach ($desc['options'] as $oname => $option) {
                        if (isset($option['shortopt']) && strlen($option['shortopt']) > 1) {
                            return PEAR::raiseError('Option "' . $oname . '" short option "' .
                                $option['shortopt'] . '" must be ' .
                                'only 1 character in Command "' . $command . '" in class "' .
                                $class . '"');
                        }
                    }
                }
            }
        }

        ksort($GLOBALS['_PEAR_Command_shortcuts']);
        ksort($GLOBALS['_PEAR_Command_commandlist']);
        @closedir($dp);
        return true;
    }

    // }}}
    // {{{ getCommands()

    /**
     * Get the list of currently supported commands, and what
     * classes implement them.
     *
     * @return array command => implementing class
     */
    public static function getCommands()
    {
        if (empty($GLOBALS['_PEAR_Command_commandlist'])) {
            PEAR_Command::registerCommands();
        }
        return $GLOBALS['_PEAR_Command_commandlist'];
    }

    // }}}
    // {{{ getShortcuts()

    /**
     * Get the list of command shortcuts.
     *
     * @return array shortcut => command
     */
    public static function getShortcuts()
    {
        if (empty($GLOBALS['_PEAR_Command_shortcuts'])) {
            PEAR_Command::registerCommands();
        }
        return $GLOBALS['_PEAR_Command_shortcuts'];
    }

    // }}}
    // {{{ getGetoptArgs()

    /**
     * Compiles arguments for getopt.
     *
     * @param string $command     command to get optstring for
     * @param string $short_args  (reference) short getopt format
     * @param array  $long_args   (reference) long getopt format
     *
     * @return void
     */
    public static function getGetoptArgs($command, &$short_args, &$long_args)
    {
        if (empty($GLOBALS['_PEAR_Command_commandlist'])) {
            PEAR_Command::registerCommands();
        }
        if (isset($GLOBALS['_PEAR_Command_shortcuts'][$command])) {
            $command = $GLOBALS['_PEAR_Command_shortcuts'][$command];
        }
        if (!isset($GLOBALS['_PEAR_Command_commandlist'][$command])) {
            return null;
        }
        $obj = &PEAR_Command::getObject($command);
        return $obj->getGetoptArgs($command, $short_args, $long_args);
    }

    // }}}
    // {{{ getDescription()

    /**
     * Get description for a command.
     *
     * @param  string $command Name of the command
     *
     * @return string command description
     */
    public static function getDescription($command)
    {
        if (!isset($GLOBALS['_PEAR_Command_commanddesc'][$command])) {
            return null;
        }
        return $GLOBALS['_PEAR_Command_commanddesc'][$command];
    }

    // }}}
    // {{{ getHelp()

    /**
     * Get help for command.
     *
     * @param string $command Name of the command to return help for
     */
    public static function getHelp($command)
    {
        $cmds = PEAR_Command::getCommands();
        if (isset($GLOBALS['_PEAR_Command_shortcuts'][$command])) {
            $command = $GLOBALS['_PEAR_Command_shortcuts'][$command];
        }
        if (isset($cmds[$command])) {
            $obj = &PEAR_Command::getObject($command);
            return $obj->getHelp($command);
        }
        return false;
    }
    // }}}
}                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      <?php
/**
 * PEAR_Command_Auth (login, logout commands)
 *
 * PHP versions 4 and 5
 *
 * @category   pear
 * @package    PEAR
 * @author     Stig Bakken <ssb@php.net>
 * @author     Greg Beaver <cellog@php.net>
 * @copyright  1997-2009 The Authors
 * @license    http://opensource.org/licenses/bsd-license.php New BSD License
 * @link       http://pear.php.net/package/PEAR
 * @since      File available since Release 0.1
 * @deprecated since 1.8.0alpha1
 */

/**
 * base class
 */
require_once 'PEAR/Command/Channels.php';

/**
 * PEAR commands for login/logout
 *
 * @category   pear
 * @package    PEAR
 * @author     Stig Bakken <ssb@php.net>
 * @author     Greg Beaver <cellog@php.net>
 * @copyright  1997-2009 The Authors
 * @license    http://opensource.org/licenses/bsd-license.php New BSD License
 * @version    Release: 1.10.5
 * @link       http://pear.php.net/package/PEAR
 * @since      Class available since Release 0.1
 * @deprecated since 1.8.0alpha1
 */
class PEAR_Command_Auth extends PEAR_Command_Channels
{
    var $commands = array(
        'login' => array(
            'summary' => 'Connects and authenticates to remote server [Deprecated in favor of channel-login]',
            'shortcut' => 'li',
            'function' => 'doLogin',
            'options' => array(),
            'doc' => '<channel name>
WARNING: This function is deprecated in favor of using channel-login

Log in to a remote channel server.  If <channel name> is not supplied,
the default channel is used. To use remote functions in the installer
that require any kind of privileges, you need to log in first.  The
username and password you enter here will be stored in your per-user
PEAR configuration (~/.pearrc on Unix-like systems).  After logging
in, your username and password will be sent along in subsequent
operations on the remote server.',
            ),
        'logout' => array(
            'summary' => 'Logs out from the remote server [Deprecated in favor of channel-logout]',
            'shortcut' => 'lo',
            'function' => 'doLogout',
            'options' => array(),
            'doc' => '
WARNING: This function is deprecated in favor of using channel-logout

Logs out from the remote server.  This command does not actually
connect to the remote server, it only deletes the stored username and
password from your user configuration.',
            )

        );

    /**
     * PEAR_Command_Auth constructor.
     *
     * @access public
     */
    function __construct(&$ui, &$config)
    {
        parent::__construct($ui, $config);
    }
}
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      <commands version="1.0">
 <login>
  <summary>Connects and authenticates to remote server [Deprecated in favor of channel-login]</summary>
  <function>doLogin</function>
  <shortcut>li</shortcut>
  <options />
  <doc>&lt;channel name&gt;
WARNING: This function is deprecated in favor of using channel-login

Log in to a remote channel server.  If &lt;channel name&gt; is not supplied,
the default channel is used. To use remote functions in the installer
that require any kind of privileges, you need to log in first.  The
username and password you enter here will be stored in your per-user
PEAR configuration (~/.pearrc on Unix-like systems).  After logging
in, your username and password will be sent along in subsequent
operations on the remote server.</doc>
 </login>
 <logout>
  <summary>Logs out from the remote server [Deprecated in favor of channel-logout]</summary>
  <function>doLogout</function>
  <shortcut>lo</shortcut>
  <options />
  <doc>
WARNING: This function is deprecated in favor of using channel-logout

Logs out from the remote server.  This command does not actually
connect to the remote server, it only deletes the stored username and
password from your user configuration.</doc>
 </logout>
</commands>                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    <?php
/**
 * PEAR_Command_Auth (build command)
 *
 * PHP versions 4 and 5
 *
 * @category   pear
 * @package    PEAR
 * @author     Stig Bakken <ssb@php.net>
 * @author     Tomas V.V.Cox <cox@idecnet.com>
 * @author     Greg Beaver <cellog@php.net>
 * @copyright  1997-2009 The Authors
 * @license    http://opensource.org/licenses/bsd-license.php New BSD License
 * @link       http://pear.php.net/package/PEAR
 * @since      File available since Release 0.1
 */

/**
 * base class
 */
require_once 'PEAR/Command/Common.php';

/**
 * PEAR commands for building extensions.
 *
 * @category   pear
 * @package    PEAR
 * @author     Stig Bakken <ssb@php.net>
 * @author     Tomas V.V.Cox <cox@idecnet.com>
 * @author     Greg Beaver <cellog@php.net>
 * @copyright  1997-2009 The Authors
 * @license    http://opensource.org/licenses/bsd-license.php New BSD License
 * @version    Release: 1.10.5
 * @link       http://pear.php.net/package/PEAR
 * @since      Class available since Release 0.1
 */
class PEAR_Command_Build extends PEAR_Command_Common
{
    var $commands = array(
        'build' => array(
            'summary' => 'Build an Extension From C Source',
            'function' => 'doBuild',
            'shortcut' => 'b',
            'options' => array(),
            'doc' => '[package.xml]
Builds one or more extensions contained in a package.'
            ),
        );

    /**
     * PEAR_Command_Build constructor.
     *
     * @access public
     */
    function __construct(&$ui, &$config)
    {
        parent::__construct($ui, $config);
    }

    function doBuild($command, $options, $params)
    {
        require_once 'PEAR/Builder.php';
        if (sizeof($params) < 1) {
            $params[0] = 'package.xml';
        }

        $builder = new PEAR_Builder($this->ui);
        $this->debug = $this->config->get('verbose');
        $err = $builder->build($params[0], array(&$this, 'buildCallback'));
        if (PEAR::isError($err)) {
            return $err;
        }

        return true;
    }

    function buildCallback($what, $data)
    {
        if (($what == 'cmdoutput' && $this->debug > 1) ||
            ($what == 'output' && $this->debug > 0)) {
            $this->ui->outputData(rtrim($data), 'build');
        }
    }
}
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          <commands version="1.0">
 <build>
  <summary>Build an Extension From C Source</summary>
  <function>doBuild</function>
  <shortcut>b</shortcut>
  <options />
  <doc>[package.xml]
Builds one or more extensions contained in a package.</doc>
 </build>
</commands>                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            <?php
// /* vim: set expandtab tabstop=4 shiftwidth=4: */
/**
 * PEAR_Command_Channels (list-channels, update-channels, channel-delete, channel-add,
 * channel-update, channel-info, channel-alias, channel-discover commands)
 *
 * PHP versions 4 and 5
 *
 * @category   pear
 * @package    PEAR
 * @author     Stig Bakken <ssb@php.net>
 * @author     Greg Beaver <cellog@php.net>
 * @copyright  1997-2009 The Authors
 * @license    http://opensource.org/licenses/bsd-license.php New BSD License
 * @link       http://pear.php.net/package/PEAR
 * @since      File available since Release 1.4.0a1
 */

/**
 * base class
 */
require_once 'PEAR/Command/Common.php';

define('PEAR_COMMAND_CHANNELS_CHANNEL_EXISTS', -500);

/**
 * PEAR commands for managing channels.
 *
 * @category   pear
 * @package    PEAR
 * @author     Greg Beaver <cellog@php.net>
 * @copyright  1997-2009 The Authors
 * @license    http://opensource.org/licenses/bsd-license.php New BSD License
 * @version    Release: 1.10.5
 * @link       http://pear.php.net/package/PEAR
 * @since      Class available since Release 1.4.0a1
 */
class PEAR_Command_Channels extends PEAR_Command_Common
{
    var $commands = array(
        'list-channels' => array(
            'summary' => 'List Available Channels',
            'function' => 'doList',
            'shortcut' => 'lc',
            'options' => array(),
            'doc' => '
List all available channels for installation.
',
            ),
        'update-channels' => array(
            'summary' => 'Update the Channel List',
            'function' => 'doUpdateAll',
            'shortcut' => 'uc',
            'options' => array(),
            'doc' => '
List all installed packages in all channels.
'
            ),
        'channel-delete' => array(
            'summary' => 'Remove a Channel From the List',
            'function' => 'doDelete',
            'shortcut' => 'cde',
            'options' => array(),
            'doc' => '<channel name>
Delete a channel from the registry.  You may not
remove any channel that has installed packages.
'
            ),
        'channel-add' => array(
            'summary' => 'Add a Channel',
            'function' => 'doAdd',
            'shortcut' => 'ca',
            'options' => array(),
            'doc' => '<channel.xml>
Add a private channel to the channel list.  Note that all
public channels should be synced using "update-channels".
Parameter may be either a local file or remote URL to a
channel.xml.
'
            ),
        'channel-update' => array(
            'summary' => 'Update an Existing Channel',
            'function' => 'doUpdate',
            'shortcut' => 'cu',
            'options' => array(
                'force' => array(
                    'shortopt' => 'f',
                    'doc' => 'will force download of new channel.xml if an existing channel name is used',
                    ),
                'channel' => array(
                    'shortopt' => 'c',
                    'arg' => 'CHANNEL',
                    'doc' => 'will force download of new channel.xml if an existing channel name is used',
                    ),
),
            'doc' => '[<channel.xml>|<channel name>]
Update a channel in the channel list directly.  Note that all
public channels can be synced using "update-channels".
Parameter may be a local or remote channel.xml, or the name of
an existing channel.
'
            ),
        'channel-info' => array(
            'summary' => 'Retrieve Information on a Channel',
            'function' => 'doInfo',
            'shortcut' => 'ci',
            'options' => array(),
            'doc' => '<package>
List the files in an installed package.
'
            ),
        'channel-alias' => array(
            'summary' => 'Specify an alias to a channel name',
            'function' => 'doAlias',
            'shortcut' => 'cha',
            'options' => array(),
            'doc' => '<channel> <alias>
Specify a specific alias to use for a channel name.
The alias may not be an existing channel name or
alias.
'
            ),
        'channel-discover' => array(
            'summary' => 'Initialize a Channel from its server',
            'function' => 'doDiscover',
            'shortcut' => 'di',
            'options' => array(),
            'doc' => '[<channel.xml>|<channel name>]
Initialize a channel from its server and create a local channel.xml.
If <channel name> is in the format "<username>:<password>@<channel>" then
<username> and <password> will be set as the login username/password for
<channel>. Use caution when passing the username/password in this way, as
it may allow other users on your computer to briefly view your username/
password via the system\'s process list.
'
            ),
        'channel-login' => array(
            'summary' => 'Connects and authenticates to remote channel server',
            'shortcut' => 'cli',
            'function' => 'doLogin',
            'options' => array(),
            'doc' => '<channel name>
Log in to a remote channel server.  If <channel name> is not supplied,
the default channel is used. To use remote functions in the installer
that require any kind of privileges, you need to log in first.  The
username and password you enter here will be stored in your per-user
PEAR configuration (~/.pearrc on Unix-like systems).  After logging
in, your username and password will be sent along in subsequent
operations on the remote server.',
            ),
        'channel-logout' => array(
            'summary' => 'Logs out from the remote channel server',
            'shortcut' => 'clo',
            'function' => 'doLogout',
            'options' => array(),
            'doc' => '<channel name>
Logs out from a remote channel server.  If <channel name> is not supplied,
the default channel is used. This command does not actually connect to the
remote server, it only deletes the stored username and password from your user
configuration.',
            ),
        );

    /**
     * PEAR_Command_Registry constructor.
     *
     * @access public
     */
    function __construct(&$ui, &$config)
    {
        parent::__construct($ui, $config);
    }

    function _sortChannels($a, $b)
    {
        return strnatcasecmp($a->getName(), $b->getName());
    }

    function doList($command, $options, $params)
    {
        $reg = &$this->config->getRegistry();
        $registered = $reg->getChannels();
        usort($registered, array(&$this, '_sortchannels'));
        $i = $j = 0;
        $data = array(
            'caption' => 'Registered Channels:',
            'border' => true,
            'headline' => array('Channel', 'Alias', 'Summary')
            );
        foreach ($registered as $channel) {
            $data['data'][] = array($channel->getName(),
                                    $channel->getAlias(),
                                    $channel->getSummary());
        }

        if (count($registered) === 0) {
            $data = '(no registered channels)';
        }
        $this->ui->outputData($data, $command);
        return true;
    }

    function doUpdateAll($command, $options, $params)
    {
        $reg = &$this->config->getRegistry();
        $channels = $reg->getChannels();

        $success = true;
        foreach ($channels as $channel) {
            if ($channel->getName() != '__uri') {
                PEAR::staticPushErrorHandling(PEAR_ERROR_RETURN);
                $err = $this->doUpdate('channel-update',
                                          $options,
                                          array($channel->getName()));
                if (PEAR::isError($err)) {
                    $this->ui->outputData($err->getMessage(), $command);
                    $success = false;
                } else {
                    $success &= $err;
                }
            }
        }
        return $success;
    }

    function doInfo($command, $options, $params)
    {
        if (count($params) !== 1) {
            return $this->raiseError("No channel specified");
        }

        $reg     = &$this->config->getRegistry();
        $channel = strtolower($params[0]);
        if ($reg->channelExists($channel)) {
            $chan = $reg->getChannel($channel);
            if (PEAR::isError($chan)) {
                return $this->raiseError($chan);
            }
        } else {
            if (strpos($channel, '://')) {
                $downloader = &$this->getDownloader();
                $tmpdir = $this->config->get('temp_dir');
                PEAR::staticPushErrorHandling(PEAR_ERROR_RETURN);
                $loc = $downloader->downloadHttp($channel, $this->ui, $tmpdir);
                PEAR::staticPopErrorHandling();
                if (PEAR::isError($loc)) {
                    return $this->raiseError('Cannot open "' . $channel .
                        '" (' . $loc->getMessage() . ')');
                } else {
                    $contents = implode('', file($loc));
                }
            } else {
                if (!file_exists($params[0])) {
                    return $this->raiseError('Unknown channel "' . $channel . '"');
                }

                $fp = fopen($params[0], 'r');
                if (!$fp) {
                    return $this->raiseError('Cannot open "' . $params[0] . '"');
                }

                $contents = '';
                while (!feof($fp)) {
                    $contents .= fread($fp, 1024);
                }
                fclose($fp);
            }

            if (!class_exists('PEAR_ChannelFile')) {
                require_once 'PEAR/ChannelFile.php';
            }

            $chan = new PEAR_ChannelFile;
            $chan->fromXmlString($contents);
            $chan->validate();
            if ($errs = $chan->getErrors(true)) {
                foreach ($errs as $err) {
                    $this->ui->outputData($err['level'] . ': ' . $err['message']);
                }
                return $this->raiseError('Channel file "' . $params[0] . '" is not valid');
            }
        }

        if (!$chan) {
            return $this->raiseError('Serious error: Channel "' . $params[0] .
                '" has a corrupted registry entry');
        }

        $channel = $chan->getName();
        $caption = 'Channel ' . $channel . ' Information:';
        $data1 = array(
            'caption' => $caption,
            'border' => true);
        $data1['data']['server'] = array('Name and Server', $chan->getName());
        if ($chan->getAlias() != $chan->getName()) {
            $data1['data']['alias'] = array('Alias', $chan->getAlias());
        }

        $data1['data']['summary'] = array('Summary', $chan->getSummary());
        $validate = $chan->getValidationPackage();
        $data1['data']['vpackage'] = array('Validation Package Name', $validate['_content']);
        $data1['data']['vpackageversion'] =
            array('Validation Package Version', $validate['attribs']['version']);
        $d = array();
        $d['main'] = $data1;

        $data['data'] = array();
        $data['caption'] = 'Server Capabilities';
        $data['headline'] = array('Type', 'Version/REST type', 'Function Name/REST base');
        if ($chan->supportsREST()) {
            if ($chan->supportsREST()) {
                $funcs = $chan->getFunctions('rest');
                if (!isset($funcs[0])) {
                    $funcs = array($funcs);
                }
                foreach ($funcs as $protocol) {
                    $data['data'][] = array('rest', $protocol['attribs']['type'],
                        $protocol['_content']);
                }
            }
        } else {
            $data['data'][] = array('No supported protocols');
        }

        $d['protocols'] = $data;
        $data['data'] = array();
        $mirrors = $chan->getMirrors();
        if ($mirrors) {
            $data['caption'] = 'Channel ' . $channel . ' Mirrors:';
            unset($data['headline']);
            foreach ($mirrors as $mirror) {
                $data['data'][] = array($mirror['attribs']['host']);
                $d['mirrors'] = $data;
            }

            foreach ($mirrors as $i => $mirror) {
                $data['data'] = array();
                $data['caption'] = 'Mirror ' . $mirror['attribs']['host'] . ' Capabilities';
                $data['headline'] = array('Type', 'Version/REST type', 'Function Name/REST base');
                if ($chan->supportsREST($mirror['attribs']['host'])) {
                    if ($chan->supportsREST($mirror['attribs']['host'])) {
                        $funcs = $chan->getFunctions('rest', $mirror['attribs']['host']);
                        if (!isset($funcs[0])) {
                            $funcs = array($funcs);
                        }

                        foreach ($funcs as $protocol) {
                            $data['data'][] = array('rest', $protocol['attribs']['type'],
                                $protocol['_content']);
                        }
                    }
                } else {
                    $data['data'][] = array('No supported protocols');
                }
                $d['mirrorprotocols' . $i] = $data;
            }
        }
        $this->ui->outputData($d, 'channel-info');
    }

    // }}}

    function doDelete($command, $options, $params)
    {
        if (count($params) !== 1) {
            return $this->raiseError('channel-delete: no channel specified');
        }

        $reg = &$this->config->getRegistry();
        if (!$reg->channelExists($params[0])) {
            return $this->raiseError('channel-delete: channel "' . $params[0] . '" does not exist');
        }

        $channel = $reg->channelName($params[0]);
        if ($channel == 'pear.php.net') {
            return $this->raiseError('Cannot delete the pear.php.net channel');
        }

        if ($channel == 'pecl.php.net') {
            return $this->raiseError('Cannot delete the pecl.php.net channel');
        }

        if ($channel == 'doc.php.net') {
            return $this->raiseError('Cannot delete the doc.php.net channel');
        }

        if ($channel == '__uri') {
            return $this->raiseError('Cannot delete the __uri pseudo-channel');
        }

        if (PEAR::isError($err = $reg->listPackages($channel))) {
            return $err;
        }

        if (count($err)) {
            return $this->raiseError('Channel "' . $channel .
                '" has installed packages, cannot delete');
        }

        if (!$reg->deleteChannel($channel)) {
            return $this->raiseError('Channel "' . $channel . '" deletion failed');
        } else {
            $this->config->deleteChannel($channel);
            $this->ui->outputData('Channel "' . $channel . '" deleted', $command);
        }
    }

    function doAdd($command, $options, $params)
    {
        if (count($params) !== 1) {
            return $this->raiseError('channel-add: no channel file specified');
        }

        if (strpos($params[0], '://')) {
            $downloader = &$this->getDownloader();
            $tmpdir = $this->config->get('temp_dir');
            if (!file_exists($tmpdir)) {
                require_once 'System.php';
                PEAR::staticPushErrorHandling(PEAR_ERROR_RETURN);
                $err = System::mkdir(array('-p', $tmpdir));
                PEAR::staticPopErrorHandling();
                if (PEAR::isError($err)) {
                    return $this->raiseError('channel-add: temp_dir does not exist: "' .
                        $tmpdir .
                        '" - You can change this location with "pear config-set temp_dir"');
                }
            }

            if (!is_writable($tmpdir)) {
                return $this->raiseError('channel-add: temp_dir is not writable: "' .
                    $tmpdir .
                    '" - You can change this location with "pear config-set temp_dir"');
            }

            PEAR::staticPushErrorHandling(PEAR_ERROR_RETURN);
            $loc = $downloader->downloadHttp($params[0], $this->ui, $tmpdir, null, false);
            PEAR::staticPopErrorHandling();
            if (PEAR::isError($loc)) {
                return $this->raiseError('channel-add: Cannot open "' . $params[0] .
                    '" (' . $loc->getMessage() . ')');
            }

            list($loc, $lastmodified) = $loc;
            $contents = implode('', file($loc));
        } else {
            $lastmodified = $fp = false;
            if (file_exists($params[0])) {
                $fp = fopen($params[0], 'r');
            }

            if (!$fp) {
                return $this->raiseError('channel-add: cannot open "' . $params[0] . '"');
            }

            $contents = '';
            while (!feof($fp)) {
                $contents .= fread($fp, 1024);
            }
            fclose($fp);
        }

        if (!class_exists('PEAR_ChannelFile')) {
            require_once 'PEAR/ChannelFile.php';
        }

        $channel = new PEAR_ChannelFile;
        PEAR::staticPushErrorHandling(PEAR_ERROR_RETURN);
        $result = $channel->fromXmlString($contents);
        PEAR::staticPopErrorHandling();
        if (!$result) {
            $exit = false;
            if (count($errors = $channel->getErrors(true))) {
                foreach ($errors as $error) {
                    $this->ui->outputData(ucfirst($error['level'] . ': ' . $error['message']));
                    if (!$exit) {
                        $exit = $error['level'] == 'error' ? true : false;
                    }
                }
                if ($exit) {
                    return $this->raiseError('channel-add: invalid channel.xml file');
                }
            }
        }

        $reg = &$this->config->getRegistry();
        if ($reg->channelExists($channel->getName())) {
            return $this->raiseError('channel-add: Channel "' . $channel->getName() .
                '" exists, use channel-update to update entry', PEAR_COMMAND_CHANNELS_CHANNEL_EXISTS);
        }

        $ret = $reg->addChannel($channel, $lastmodified);
        if (PEAR::isError($ret)) {
            return $ret;
        }

        if (!$ret) {
            return $this->raiseError('channel-add: adding Channel "' . $channel->getName() .
                '" to registry failed');
        }

        $this->config->setChannels($reg->listChannels());
        $this->config->writeConfigFile();
        $this->ui->outputData('Adding Channel "' . $channel->getName() . '" succeeded', $command);
    }

    function doUpdate($command, $options, $params)
    {
        if (count($params) !== 1) {
            return $this->raiseError("No channel file specified");
        }

        $tmpdir = $this->config->get('temp_dir');
        if (!file_exists($tmpdir)) {
            require_once 'System.php';
            PEAR::staticPushErrorHandling(PEAR_ERROR_RETURN);
            $err = System::mkdir(array('-p', $tmpdir));
            PEAR::staticPopErrorHandling();
            if (PEAR::isError($err)) {
                return $this->raiseError('channel-add: temp_dir does not exist: "' .
                    $tmpdir .
                    '" - You can change this location with "pear config-set temp_dir"');
            }
        }

        if (!is_writable($tmpdir)) {
            return $this->raiseError('channel-add: temp_dir is not writable: "' .
                $tmpdir .
                '" - You can change this location with "pear config-set temp_dir"');
        }

        $reg = &$this->config->getRegistry();
        $lastmodified = false;
        if ((!file_exists($params[0]) || is_dir($params[0]))
              && $reg->channelExists(strtolower($params[0]))) {
            $c = $reg->getChannel(strtolower($params[0]));
            if (PEAR::isError($c)) {
                return $this->raiseError($c);
            }

            $this->ui->outputData("Updating channel \"$params[0]\"", $command);
            $dl = &$this->getDownloader(array());
            // if force is specified, use a timestamp of "1" to force retrieval
            $lastmodified = isset($options['force']) ? false : $c->lastModified();
            PEAR::staticPushErrorHandling(PEAR_ERROR_RETURN);
            $contents = $dl->downloadHttp('http://' . $c->getName() . '/channel.xml',
                $this->ui, $tmpdir, null, $lastmodified);
            PEAR::staticPopErrorHandling();
            if (PEAR::isError($contents)) {
                // Attempt to fall back to https
                $this->ui->outputData("Channel \"$params[0]\" is not responding over http://, failed with message: " . $contents->getMessage());
                $this->ui->outputData("Trying channel \"$params[0]\" over https:// instead");
                PEAR::staticPushErrorHandling(PEAR_ERROR_RETURN);
                $contents = $dl->downloadHttp('https://' . $c->getName() . '/channel.xml',
                    $this->ui, $tmpdir, null, $lastmodified);
                PEAR::staticPopErrorHandling();
                if (PEAR::isError($contents)) {
                    return $this->raiseError('Cannot retrieve channel.xml for channel "' .
                        $c->getName() . '" (' . $contents->getMessage() . ')');
                }
            }

            list($contents, $lastmodified) = $contents;
            if (!$contents) {
                $this->ui->outputData("Channel \"$params[0]\" is up to date");
                return;
            }

            $contents = implode('', file($contents));
            if (!class_exists('PEAR_ChannelFile')) {
                require_once 'PEAR/ChannelFile.php';
            }

            $channel = new PEAR_ChannelFile;
            $channel->fromXmlString($contents);
            if (!$channel->getErrors()) {
                // security check: is the downloaded file for the channel we got it from?
                if (strtolower($channel->getName()) != strtolower($c->getName())) {
                    if (!isset($options['force'])) {
                        return $this->raiseError('ERROR: downloaded channel definition file' .
                            ' for channel "' . $channel->getName() . '" from channel "' .
                            strtolower($c->getName()) . '"');
                    }

                    $this->ui->log(0, 'WARNING: downloaded channel definition file' .
                        ' for channel "' . $channel->getName() . '" from channel "' .
                        strtolower($c->getName()) . '"');
                }
            }
        } else {
            if (strpos($params[0], '://')) {
                $dl = &$this->getDownloader();
                PEAR::staticPushErrorHandling(PEAR_ERROR_RETURN);
                $loc = $dl->downloadHttp($params[0],
                    $this->ui, $tmpdir, null, $lastmodified);
                PEAR::staticPopErrorHandling();
                if (PEAR::isError($loc)) {
                    return $this->raiseError("Cannot open " . $params[0] .
                         ' (' . $loc->getMessage() . ')');
                }

                list($loc, $lastmodified) = $loc;
                $contents = implode('', file($loc));
            } else {
                $fp = false;
                if (file_exists($params[0])) {
                    $fp = fopen($params[0], 'r');
                }

                if (!$fp) {
                    return $this->raiseError("Cannot open " . $params[0]);
                }

                $contents = '';
                while (!feof($fp)) {
                    $contents .= fread($fp, 1024);
                }
                fclose($fp);
            }

            if (!class_exists('PEAR_ChannelFile')) {
                require_once 'PEAR/ChannelFile.php';
            }

            $channel = new PEAR_ChannelFile;
            $channel->fromXmlString($contents);
        }

        $exit = false;
        if (count($errors = $channel->getErrors(true))) {
            foreach ($errors as $error) {
                $this->ui->outputData(ucfirst($error['level'] . ': ' . $error['message']));
                if (!$exit) {
                    $exit = $error['level'] == 'error' ? true : false;
                }
            }
            if ($exit) {
                return $this->raiseError('Invalid channel.xml file');
            }
        }

        if (!$reg->channelExists($channel->getName())) {
            return $this->raiseError('Error: Channel "' . $channel->getName() .
                '" does not exist, use channel-add to add an entry');
        }

        $ret = $reg->updateChannel($channel, $lastmodified);
        if (PEAR::isError($ret)) {
            return $ret;
        }

        if (!$ret) {
            return $this->raiseError('Updating Channel "' . $channel->getName() .
                '" in registry failed');
        }

        $this->config->setChannels($reg->listChannels());
        $this->config->writeConfigFile();
        $this->ui->outputData('Update of Channel "' . $channel->getName() . '" succeeded');
    }

    function &getDownloader()
    {
        if (!class_exists('PEAR_Downloader')) {
            require_once 'PEAR/Downloader.php';
        }
        $a = new PEAR_Downloader($this->ui, array(), $this->config);
        return $a;
    }

    function doAlias($command, $options, $params)
    {
        if (count($params) === 1) {
            return $this->raiseError('No channel alias specified');
        }

        if (count($params) !== 2 || (!empty($params[1]) && $params[1]{0} == '-')) {
            return $this->raiseError(
                'Invalid format, correct is: channel-alias channel alias');
        }

        $reg = &$this->config->getRegistry();
        if (!$reg->channelExists($params[0], true)) {
            $extra = '';
            if ($reg->isAlias($params[0])) {
                $extra = ' (use "channel-alias ' . $reg->channelName($params[0]) . ' ' .
                    strtolower($params[1]) . '")';
            }

            return $this->raiseError('"' . $params[0] . '" is not a valid channel' . $extra);
        }

        if ($reg->isAlias($params[1])) {
            return $this->raiseError('Channel "' . $reg->channelName($params[1]) . '" is ' .
                'already aliased to "' . strtolower($params[1]) . '", cannot re-alias');
        }

        $chan = $reg->getChannel($params[0]);
        if (PEAR::isError($chan)) {
            return $this->raiseError('Corrupt registry?  Error retrieving channel "' . $params[0] .
                '" information (' . $chan->getMessage() . ')');
        }

        // make it a local alias
        if (!$chan->setAlias(strtolower($params[1]), true)) {
            return $this->raiseError('Alias "' . strtolower($params[1]) .
                '" is not a valid channel alias');
        }

        $reg->updateChannel($chan);
        $this->ui->outputData('Channel "' . $chan->getName() . '" aliased successfully to "' .
            strtolower($params[1]) . '"');
    }

    /**
     * The channel-discover command
     *
     * @param string $command command name
     * @param array  $options option_name => value
     * @param array  $params  list of additional parameters.
     *               $params[0] should contain a string with either:
     *               - <channel name> or
     *               - <username>:<password>@<channel name>
     * @return null|PEAR_Error
     */
    function doDiscover($command, $options, $params)
    {
        if (count($params) !== 1) {
            return $this->raiseError("No channel server specified");
        }

        // Look for the possible input format "<username>:<password>@<channel>"
        if (preg_match('/^(.+):(.+)@(.+)\\z/', $params[0], $matches)) {
            $username = $matches[1];
            $password = $matches[2];
            $channel  = $matches[3];
        } else {
            $channel = $params[0];
        }

        $reg = &$this->config->getRegistry();
        if ($reg->channelExists($channel)) {
            if (!$reg->isAlias($channel)) {
                return $this->raiseError("Channel \"$channel\" is already initialized", PEAR_COMMAND_CHANNELS_CHANNEL_EXISTS);
            }

            return $this->raiseError("A channel alias named \"$channel\" " .
                'already exists, aliasing channel "' . $reg->channelName($channel)
                . '"');
        }

        $this->pushErrorHandling(PEAR_ERROR_RETURN);
        $err = $this->doAdd($command, $options, array('http://' . $channel . '/channel.xml'));
        $this->popErrorHandling();
        if (PEAR::isError($err)) {
            if ($err->getCode() === PEAR_COMMAND_CHANNELS_CHANNEL_EXISTS) {
                return $this->raiseError("Discovery of channel \"$channel\" failed (" .
                    $err->getMessage() . ')');
            }
            // Attempt fetch via https
            $this->ui->outputData("Discovering channel $channel over http:// failed with message: " . $err->getMessage());
            $this->ui->outputData("Trying to discover channel $channel over https:// instead");
            $this->pushErrorHandling(PEAR_ERROR_RETURN);
            $err = $this->doAdd($command, $options, array('https://' . $channel . '/channel.xml'));
            $this->popErrorHandling();
            if (PEAR::isError($err)) {
                return $this->raiseError("Discovery of channel \"$channel\" failed (" .
                    $err->getMessage() . ')');
            }
        }

        // Store username/password if they were given
        // Arguably we should do a logintest on the channel here, but since
        // that's awkward on a REST-based channel (even "pear login" doesn't
        // do it for those), and XML-RPC is deprecated, it's fairly pointless.
        if (isset($username)) {
            $this->config->set('username', $username, 'user', $channel);
            $this->config->set('password', $password, 'user', $channel);
            $this->config->store();
            $this->ui->outputData("Stored login for channel \"$channel\" using username \"$username\"", $command);
        }

        $this->ui->outputData("Discovery of channel \"$channel\" succeeded", $command);
    }

    /**
     * Execute the 'login' command.
     *
     * @param string $command command name
     * @param array $options option_name => value
     * @param array $params list of additional parameters
     *
     * @return bool TRUE on success or
     * a PEAR error on failure
     *
     * @access public
     */
    function doLogin($command, $options, $params)
    {
        $reg = &$this->config->getRegistry();

        // If a parameter is supplied, use that as the channel to log in to
        $channel = isset($params[0]) ? $params[0] : $this->config->get('default_channel');

        $chan = $reg->getChannel($channel);
        if (PEAR::isError($chan)) {
            return $this->raiseError($chan);
        }

        $server   = $this->config->get('preferred_mirror', null, $channel);
        $username = $this->config->get('username',         null, $channel);
        if (empty($username)) {
            $username = isset($_ENV['USER']) ? $_ENV['USER'] : null;
        }
        $this->ui->outputData("Logging in to $server.", $command);

        list($username, $password) = $this->ui->userDialog(
            $command,
            array('Username', 'Password'),
            array('text',     'password'),
            array($username,  '')
            );
        $username = trim($username);
        $password = trim($password);

        $ourfile = $this->config->getConfFile('user');
        if (!$ourfile) {
            $ourfile = $this->config->getConfFile('system');
        }

        $this->config->set('username', $username, 'user', $channel);
        $this->config->set('password', $password, 'user', $channel);

        if ($chan->supportsREST()) {
            $ok = true;
        }

        if ($ok !== true) {
            return $this->raiseError('Login failed!');
        }

        $this->ui->outputData("Logged in.", $command);
        // avoid changing any temporary settings changed with -d
        $ourconfig = new PEAR_Config($ourfile, $ourfile);
        $ourconfig->set('username', $username, 'user', $channel);
        $ourconfig->set('password', $password, 'user', $channel);
        $ourconfig->store();

        return true;
    }

    /**
     * Execute the 'logout' command.
     *
     * @param string $command command name
     * @param array $options option_name => value
     * @param array $params list of additional parameters
     *
     * @return bool TRUE on success or
     * a PEAR error on failure
     *
     * @access public
     */
    function doLogout($command, $options, $params)
    {
        $reg     = &$this->config->getRegistry();

        // If a parameter is supplied, use that as the channel to log in to
        $channel = isset($params[0]) ? $params[0] : $this->config->get('default_channel');

        $chan    = $reg->getChannel($channel);
        if (PEAR::isError($chan)) {
            return $this->raiseError($chan);
        }

        $server = $this->config->get('preferred_mirror', null, $channel);
        $this->ui->outputData("Logging out from $server.", $command);
        $this->config->remove('username', 'user', $channel);
        $this->config->remove('password', 'user', $channel);
        $this->config->store();
        return true;
    }
}
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            <commands version="1.0">
 <list-channels>
  <summary>List Available Channels</summary>
  <function>doList</function>
  <shortcut>lc</shortcut>
  <options />
  <doc>
List all available channels for installation.
</doc>
 </list-channels>
 <update-channels>
  <summary>Update the Channel List</summary>
  <function>doUpdateAll</function>
  <shortcut>uc</shortcut>
  <options />
  <doc>
List all installed packages in all channels.
</doc>
 </update-channels>
 <channel-delete>
  <summary>Remove a Channel From the List</summary>
  <function>doDelete</function>
  <shortcut>cde</shortcut>
  <options />
  <doc>&lt;channel name&gt;
Delete a channel from the registry.  You may not
remove any channel that has installed packages.
</doc>
 </channel-delete>
 <channel-add>
  <summary>Add a Channel</summary>
  <function>doAdd</function>
  <shortcut>ca</shortcut>
  <options />
  <doc>&lt;channel.xml&gt;
Add a private channel to the channel list.  Note that all
public channels should be synced using &quot;update-channels&quot;.
Parameter may be either a local file or remote URL to a
channel.xml.
</doc>
 </channel-add>
 <channel-update>
  <summary>Update an Existing Channel</summary>
  <function>doUpdate</function>
  <shortcut>cu</shortcut>
  <options>
   <force>
    <shortopt>f</shortopt>
    <doc>will force download of new channel.xml if an existing channel name is used</doc>
   </force>
   <channel>
    <shortopt>c</shortopt>
    <doc>will force download of new channel.xml if an existing channel name is used</doc>
    <arg>CHANNEL</arg>
   </channel>
  </options>
  <doc>[&lt;channel.xml&gt;|&lt;channel name&gt;]
Update a channel in the channel list directly.  Note that all
public channels can be synced using &quot;update-channels&quot;.
Parameter may be a local or remote channel.xml, or the name of
an existing channel.
</doc>
 </channel-update>
 <channel-info>
  <summary>Retrieve Information on a Channel</summary>
  <function>doInfo</function>
  <shortcut>ci</shortcut>
  <options />
  <doc>&lt;package&gt;
List the files in an installed package.
</doc>
 </channel-info>
 <channel-alias>
  <summary>Specify an alias to a channel name</summary>
  <function>doAlias</function>
  <shortcut>cha</shortcut>
  <options />
  <doc>&lt;channel&gt; &lt;alias&gt;
Specify a specific alias to use for a channel name.
The alias may not be an existing channel name or
alias.
</doc>
 </channel-alias>
 <channel-discover>
  <summary>Initialize a Channel from its server</summary>
  <function>doDiscover</function>
  <shortcut>di</shortcut>
  <options />
  <doc>[&lt;channel.xml&gt;|&lt;channel name&gt;]
Initialize a channel from its server and create a local channel.xml.
If &lt;channel name&gt; is in the format &quot;&lt;username&gt;:&lt;password&gt;@&lt;channel&gt;&quot; then
&lt;username&gt; and &lt;password&gt; will be set as the login username/password for
&lt;channel&gt;. Use caution when passing the username/password in this way, as
it may allow other users on your computer to briefly view your username/
password via the system&#039;s process list.
</doc>
 </channel-discover>
 <channel-login>
  <summary>Connects and authenticates to remote channel server</summary>
  <function>doLogin</function>
  <shortcut>cli</shortcut>
  <options />
  <doc>&lt;channel name&gt;
Log in to a remote channel server.  If &lt;channel name&gt; is not supplied,
the default channel is used. To use remote functions in the installer
that require any kind of privileges, you need to log in first.  The
username and password you enter here will be stored in your per-user
PEAR configuration (~/.pearrc on Unix-like systems).  After logging
in, your username and password will be sent along in subsequent
operations on the remote server.</doc>
 </channel-login>
 <channel-logout>
  <summary>Logs out from the remote channel server</summary>
  <function>doLogout</function>
  <shortcut>clo</shortcut>
  <options />
  <doc>&lt;channel name&gt;
Logs out from a remote channel server.  If &lt;channel name&gt; is not supplied,
the default channel is used. This command does not actually connect to the
remote server, it only deletes the stored username and password from your user
configuration.</doc>
 </channel-logout>
</commands>                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      <?php
/**
 * PEAR_Command_Common base class
 *
 * PHP versions 4 and 5
 *
 * @category   pear
 * @package    PEAR
 * @author     Stig Bakken <ssb@php.net>
 * @author     Greg Beaver <cellog@php.net>
 * @copyright  1997-2009 The Authors
 * @license    http://opensource.org/licenses/bsd-license.php New BSD License
 * @link       http://pear.php.net/package/PEAR
 * @since      File available since Release 0.1
 */

/**
 * base class
 */
require_once 'PEAR.php';

/**
 * PEAR commands base class
 *
 * @category   pear
 * @package    PEAR
 * @author     Stig Bakken <ssb@php.net>
 * @author     Greg Beaver <cellog@php.net>
 * @copyright  1997-2009 The Authors
 * @license    http://opensource.org/licenses/bsd-license.php New BSD License
 * @version    Release: 1.10.5
 * @link       http://pear.php.net/package/PEAR
 * @since      Class available since Release 0.1
 */
class PEAR_Command_Common extends PEAR
{
    /**
     * PEAR_Config object used to pass user system and configuration
     * on when executing commands
     *
     * @var PEAR_Config
     */
    var $config;
    /**
     * @var PEAR_Registry
     * @access protected
     */
    var $_registry;

    /**
     * User Interface object, for all interaction with the user.
     * @var object
     */
    var $ui;

    var $_deps_rel_trans = array(
                                 'lt' => '<',
                                 'le' => '<=',
                                 'eq' => '=',
                                 'ne' => '!=',
                                 'gt' => '>',
                                 'ge' => '>=',
                                 'has' => '=='
                                 );

    var $_deps_type_trans = array(
                                  'pkg' => 'package',
                                  'ext' => 'extension',
                                  'php' => 'PHP',
                                  'prog' => 'external program',
                                  'ldlib' => 'external library for linking',
                                  'rtlib' => 'external runtime library',
                                  'os' => 'operating system',
                                  'websrv' => 'web server',
                                  'sapi' => 'SAPI backend'
                                  );

    /**
     * PEAR_Command_Common constructor.
     *
     * @access public
     */
    function __construct(&$ui, &$config)
    {
        parent::__construct();
        $this->config = &$config;
        $this->ui = &$ui;
    }

    /**
     * Return a list of all the commands defined by this class.
     * @return array list of commands
     * @access public
     */
    function getCommands()
    {
        $ret = array();
        foreach (array_keys($this->commands) as $command) {
            $ret[$command] = $this->commands[$command]['summary'];
        }

        return $ret;
    }

    /**
     * Return a list of all the command shortcuts defined by this class.
     * @return array shortcut => command
     * @access public
     */
    function getShortcuts()
    {
        $ret = array();
        foreach (array_keys($this->commands) as $command) {
            if (isset($this->commands[$command]['shortcut'])) {
                $ret[$this->commands[$command]['shortcut']] = $command;
            }
        }

        return $ret;
    }

    function getOptions($command)
    {
        $shortcuts = $this->getShortcuts();
        if (isset($shortcuts[$command])) {
            $command = $shortcuts[$command];
        }

        if (isset($this->commands[$command]) &&
              isset($this->commands[$command]['options'])) {
            return $this->commands[$command]['options'];
        }

        return null;
    }

    function getGetoptArgs($command, &$short_args, &$long_args)
    {
        $short_args = '';
        $long_args = array();
        if (empty($this->commands[$command]) || empty($this->commands[$command]['options'])) {
            return;
        }

        reset($this->commands[$command]['options']);
        while (list($option, $info) = each($this->commands[$command]['options'])) {
            $larg = $sarg = '';
            if (isset($info['arg'])) {
                if ($info['arg']{0} == '(') {
                    $larg = '==';
                    $sarg = '::';
                    $arg = substr($info['arg'], 1, -1);
                } else {
                    $larg = '=';
                    $sarg = ':';
                    $arg = $info['arg'];
                }
            }

            if (isset($info['shortopt'])) {
                $short_args .= $info['shortopt'] . $sarg;
            }

            $long_args[] = $option . $larg;
        }
    }

    /**
    * Returns the help message for the given command
    *
    * @param string $command The command
    * @return mixed A fail string if the command does not have help or
    *               a two elements array containing [0]=>help string,
    *               [1]=> help string for the accepted cmd args
    */
    function getHelp($command)
    {
        $config = &PEAR_Config::singleton();
        if (!isset($this->commands[$command])) {
            return "No such command \"$command\"";
        }

        $help = null;
        if (isset($this->commands[$command]['doc'])) {
            $help = $this->commands[$command]['doc'];
        }

        if (empty($help)) {
            // XXX (cox) Fallback to summary if there is no doc (show both?)
            if (!isset($this->commands[$command]['summary'])) {
                return "No help for command \"$command\"";
            }
            $help = $this->commands[$command]['summary'];
        }

        if (preg_match_all('/{config\s+([^\}]+)}/e', $help, $matches)) {
            foreach($matches[0] as $k => $v) {
                $help = preg_replace("/$v/", $config->get($matches[1][$k]), $help);
            }
        }

        return array($help, $this->getHelpArgs($command));
    }

    /**
     * Returns the help for the accepted arguments of a command
     *
     * @param  string $command
     * @return string The help string
     */
    function getHelpArgs($command)
    {
        if (isset($this->commands[$command]['options']) &&
            count($this->commands[$command]['options']))
        {
            $help = "Options:\n";
            foreach ($this->commands[$command]['options'] as $k => $v) {
                if (isset($v['arg'])) {
                    if ($v['arg'][0] == '(') {
                        $arg = substr($v['arg'], 1, -1);
                        $sapp = " [$arg]";
                        $lapp = "[=$arg]";
                    } else {
                        $sapp = " $v[arg]";
                        $lapp = "=$v[arg]";
                    }
                } else {
                    $sapp = $lapp = "";
                }

                if (isset($v['shortopt'])) {
                    $s = $v['shortopt'];
                    $help .= "  -$s$sapp, --$k$lapp\n";
                } else {
                    $help .= "  --$k$lapp\n";
                }

                $p = "        ";
                $doc = rtrim(str_replace("\n", "\n$p", $v['doc']));
                $help .= "        $doc\n";
            }

            return $help;
        }

        return null;
    }

    function run($command, $options, $params)
    {
        if (empty($this->commands[$command]['function'])) {
            // look for shortcuts
            foreach (array_keys($this->commands) as $cmd) {
                if (isset($this->commands[$cmd]['shortcut']) && $this->commands[$cmd]['shortcut'] == $command) {
                    if (empty($this->commands[$cmd]['function'])) {
                        return $this->raiseError("unknown command `$command'");
                    } else {
                        $func = $this->commands[$cmd]['function'];
                    }
                    $command = $cmd;

                    //$command = $this->commands[$cmd]['function'];
                    break;
                }
            }
        } else {
            $func = $this->commands[$command]['function'];
        }

        return $this->$func($command, $options, $params);
    }
}
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   <?php
/**
 * PEAR_Command_Config (config-show, config-get, config-set, config-help, config-create commands)
 *
 * PHP versions 4 and 5
 *
 * @category   pear
 * @package    PEAR
 * @author     Stig Bakken <ssb@php.net>
 * @author     Greg Beaver <cellog@php.net>
 * @copyright  1997-2009 The Authors
 * @license    http://opensource.org/licenses/bsd-license.php New BSD License
 * @link       http://pear.php.net/package/PEAR
 * @since      File available since Release 0.1
 */

/**
 * base class
 */
require_once 'PEAR/Command/Common.php';

/**
 * PEAR commands for managing configuration data.
 *
 * @category   pear
 * @package    PEAR
 * @author     Stig Bakken <ssb@php.net>
 * @author     Greg Beaver <cellog@php.net>
 * @copyright  1997-2009 The Authors
 * @license    http://opensource.org/licenses/bsd-license.php New BSD License
 * @version    Release: 1.10.5
 * @link       http://pear.php.net/package/PEAR
 * @since      Class available since Release 0.1
 */
class PEAR_Command_Config extends PEAR_Command_Common
{
    var $commands = array(
        'config-show' => array(
            'summary' => 'Show All Settings',
            'function' => 'doConfigShow',
            'shortcut' => 'csh',
            'options' => array(
                'channel' => array(
                    'shortopt' => 'c',
                    'doc' => 'show configuration variables for another channel',
                    'arg' => 'CHAN',
                    ),
),
            'doc' => '[layer]
Displays all configuration values.  An optional argument
may be used to tell which configuration layer to display.  Valid
configuration layers are "user", "system" and "default". To display
configurations for different channels, set the default_channel
configuration variable and run config-show again.
',
            ),
        'config-get' => array(
            'summary' => 'Show One Setting',
            'function' => 'doConfigGet',
            'shortcut' => 'cg',
            'options' => array(
                'channel' => array(
                    'shortopt' => 'c',
                    'doc' => 'show configuration variables for another channel',
                    'arg' => 'CHAN',
                    ),
),
            'doc' => '<parameter> [layer]
Displays the value of one configuration parameter.  The
first argument is the name of the parameter, an optional second argument
may be used to tell which configuration layer to look in.  Valid configuration
layers are "user", "system" and "default".  If no layer is specified, a value
will be picked from the first layer that defines the parameter, in the order
just specified.  The configuration value will be retrieved for the channel
specified by the default_channel configuration variable.
',
            ),
        'config-set' => array(
            'summary' => 'Change Setting',
            'function' => 'doConfigSet',
            'shortcut' => 'cs',
            'options' => array(
                'channel' => array(
                    'shortopt' => 'c',
                    'doc' => 'show configuration variables for another channel',
                    'arg' => 'CHAN',
                    ),
),
            'doc' => '<parameter> <value> [layer]
Sets the value of one configuration parameter.  The first argument is
the name of the parameter, the second argument is the new value.  Some
parameters are subject to validation, and the command will fail with
an error message if the new value does not make sense.  An optional
third argument may be used to specify in which layer to set the
configuration parameter.  The default layer is "user".  The
configuration value will be set for the current channel, which
is controlled by the default_channel configuration variable.
',
            ),
        'config-help' => array(
            'summary' => 'Show Information About Setting',
            'function' => 'doConfigHelp',
            'shortcut' => 'ch',
            'options' => array(),
            'doc' => '[parameter]
Displays help for a configuration parameter.  Without arguments it
displays help for all configuration parameters.
',
           ),
        'config-create' => array(
            'summary' => 'Create a Default configuration file',
            'function' => 'doConfigCreate',
            'shortcut' => 'coc',
            'options' => array(
                'windows' => array(
                    'shortopt' => 'w',
                    'doc' => 'create a config file for a windows install',
                    ),
            ),
            'doc' => '<root path> <filename>
Create a default configuration file with all directory configuration
variables set to subdirectories of <root path>, and save it as <filename>.
This is useful especially for creating a configuration file for a remote
PEAR installation (using the --remoteconfig option of install, upgrade,
and uninstall).
',
            ),
        );

    /**
     * PEAR_Command_Config constructor.
     *
     * @access public
     */
    function __construct(&$ui, &$config)
    {
        parent::__construct($ui, $config);
    }

    function doConfigShow($command, $options, $params)
    {
        $layer = null;
        if (is_array($params)) {
            $layer = isset($params[0]) ? $params[0] : null;
        }

        // $params[0] -> the layer
        if ($error = $this->_checkLayer($layer)) {
            return $this->raiseError("config-show:$error");
        }

        $keys = $this->config->getKeys();
        sort($keys);
        $channel = isset($options['channel']) ? $options['channel'] :
            $this->config->get('default_channel');
        $reg = &$this->config->getRegistry();
        if (!$reg->channelExists($channel)) {
            return $this->raiseError('Channel "' . $channel . '" does not exist');
        }

        $channel = $reg->channelName($channel);
        $data = array('caption' => 'Configuration (channel ' . $channel . '):');
        foreach ($keys as $key) {
            $type = $this->config->getType($key);
            $value = $this->config->get($key, $layer, $channel);
            if ($type == 'password' && $value) {
                $value = '********';
            }

            if ($value === false) {
                $value = 'false';
            } elseif ($value === true) {
                $value = 'true';
            }

            $data['data'][$this->config->getGroup($key)][] = array($this->config->getPrompt($key) , $key, $value);
        }

        foreach ($this->config->getLayers() as $layer) {
            $data['data']['Config Files'][] = array(ucfirst($layer) . ' Configuration File', 'Filename' , $this->config->getConfFile($layer));
        }

        $this->ui->outputData($data, $command);
        return true;
    }

    function doConfigGet($command, $options, $params)
    {
        $args_cnt = is_array($params) ? count($params) : 0;
        switch ($args_cnt) {
            case 1:
                $config_key = $params[0];
                $layer = null;
                break;
            case 2:
                $config_key = $params[0];
                $layer = $params[1];
                if ($error = $this->_checkLayer($layer)) {
                    return $this->raiseError("config-get:$error");
                }
                break;
            case 0:
            default:
                return $this->raiseError("config-get expects 1 or 2 parameters");
        }

        $reg = &$this->config->getRegistry();
        $channel = isset($options['channel']) ? $options['channel'] : $this->config->get('default_channel');
        if (!$reg->channelExists($channel)) {
            return $this->raiseError('Channel "' . $channel . '" does not exist');
        }

        $channel = $reg->channelName($channel);
        $this->ui->outputData($this->config->get($config_key, $layer, $channel), $command);
        return true;
    }

    function doConfigSet($command, $options, $params)
    {
        // $param[0] -> a parameter to set
        // $param[1] -> the value for the parameter
        // $param[2] -> the layer
        $failmsg = '';
        if (count($params) < 2 || count($params) > 3) {
            $failmsg .= "config-set expects 2 or 3 parameters";
            return PEAR::raiseError($failmsg);
        }

        if (isset($params[2]) && ($error = $this->_checkLayer($params[2]))) {
            $failmsg .= $error;
            return PEAR::raiseError("config-set:$failmsg");
        }

        $channel = isset($options['channel']) ? $options['channel'] : $this->config->get('default_channel');
        $reg = &$this->config->getRegistry();
        if (!$reg->channelExists($channel)) {
            return $this->raiseError('Channel "' . $channel . '" does not exist');
        }

        $channel = $reg->channelName($channel);
        if ($params[0] == 'default_channel' && !$reg->channelExists($params[1])) {
            return $this->raiseError('Channel "' . $params[1] . '" does not exist');
        }

        if ($params[0] == 'preferred_mirror'
            && (
                !$reg->mirrorExists($channel, $params[1]) &&
                (!$reg->channelExists($params[1]) || $channel != $params[1])
            )
        ) {
            $msg  = 'Channel Mirror "' . $params[1] . '" does not exist';
            $msg .= ' in your registry for channel "' . $channel . '".';
            $msg .= "\n" . 'Attempt to run "pear channel-update ' . $channel .'"';
            $msg .= ' if you believe this mirror should exist as you may';
            $msg .= ' have outdated channel information.';
            return $this->raiseError($msg);
        }

        if (count($params) == 2) {
            array_push($params, 'user');
            $layer = 'user';
        } else {
            $layer = $params[2];
        }

        array_push($params, $channel);
        if (!call_user_func_array(array(&$this->config, 'set'), $params)) {
            array_pop($params);
            $failmsg = "config-set (" . implode(", ", $params) . ") failed, channel $channel";
        } else {
            $this->config->store($layer);
        }

        if ($failmsg) {
            return $this->raiseError($failmsg);
        }

        $this->ui->outputData('config-set succeeded', $command);
        return true;
    }

    function doConfigHelp($command, $options, $params)
    {
        if (empty($params)) {
            $params = $this->config->getKeys();
        }

        $data['caption']  = "Config help" . ((count($params) == 1) ? " for $params[0]" : '');
        $data['headline'] = array('Name', 'Type', 'Description');
        $data['border']   = true;
        foreach ($params as $name) {
            $type = $this->config->getType($name);
            $docs = $this->config->getDocs($name);
            if ($type == 'set') {
                $docs = rtrim($docs) . "\nValid set: " .
                    implode(' ', $this->config->getSetValues($name));
            }

            $data['data'][] = array($name, $type, $docs);
        }

        $this->ui->outputData($data, $command);
    }

    function doConfigCreate($command, $options, $params)
    {
        if (count($params) != 2) {
            return PEAR::raiseError('config-create: must have 2 parameters, root path and ' .
                'filename to save as');
        }

        $root = $params[0];
        // Clean up the DIRECTORY_SEPARATOR mess
        $ds2 = DIRECTORY_SEPARATOR . DIRECTORY_SEPARATOR;
        $root = preg_replace(array('!\\\\+!', '!/+!', "!$ds2+!"),
                             array('/', '/', '/'),
                            $root);
        if ($root{0} != '/') {
            if (!isset($options['windows'])) {
                return PEAR::raiseError('Root directory must be an absolute path beginning ' .
                    'with "/", was: "' . $root . '"');
            }

            if (!preg_match('/^[A-Za-z]:/', $root)) {
                return PEAR::raiseError('Root directory must be an absolute path beginning ' .
                    'with "\\" or "C:\\", was: "' . $root . '"');
            }
        }

        $windows = isset($options['windows']);
        if ($windows) {
            $root = str_replace('/', '\\', $root);
        }

        if (!file_exists($params[1]) && !@touch($params[1])) {
            return PEAR::raiseError('Could not create "' . $params[1] . '"');
        }

        $params[1] = realpath($params[1]);
        $config = new PEAR_Config($params[1], '#no#system#config#', false, false);
        if ($root{strlen($root) - 1} == '/') {
            $root = substr($root, 0, strlen($root) - 1);
        }

        $config->noRegistry();
        $config->set('php_dir', $windows ? "$root\\pear\\php" : "$root/pear/php", 'user');
        $config->set('data_dir', $windows ? "$root\\pear\\data" : "$root/pear/data");
        $config->set('www_dir', $windows ? "$root\\pear\\www" : "$root/pear/www");
        $config->set('cfg_dir', $windows ? "$root\\pear\\cfg" : "$root/pear/cfg");
        $config->set('ext_dir', $windows ? "$root\\pear\\ext" : "$root/pear/ext");
        $config->set('doc_dir', $windows ? "$root\\pear\\docs" : "$root/pear/docs");
        $config->set('test_dir', $windows ? "$root\\pear\\tests" : "$root/pear/tests");
        $config->set('cache_dir', $windows ? "$root\\pear\\cache" : "$root/pear/cache");
        $config->set('download_dir', $windows ? "$root\\pear\\download" : "$root/pear/download");
        $config->set('temp_dir', $windows ? "$root\\pear\\temp" : "$root/pear/temp");
        $config->set('bin_dir', $windows ? "$root\\pear" : "$root/pear");
        $config->set('man_dir', $windows ? "$root\\pear\\man" : "$root/pear/man");
        $config->writeConfigFile();
        $this->_showConfig($config);
        $this->ui->outputData('Successfully created default configuration file "' . $params[1] . '"',
            $command);
    }

    function _showConfig(&$config)
    {
        $params = array('user');
        $keys = $config->getKeys();
        sort($keys);
        $channel = 'pear.php.net';
        $data = array('caption' => 'Configuration (channel ' . $channel . '):');
        foreach ($keys as $key) {
            $type = $config->getType($key);
            $value = $config->get($key, 'user', $channel);
            if ($type == 'password' && $value) {
                $value = '********';
            }

            if ($value === false) {
                $value = 'false';
            } elseif ($value === true) {
                $value = 'true';
            }
            $data['data'][$config->getGroup($key)][] =
                array($config->getPrompt($key) , $key, $value);
        }

        foreach ($config->getLayers() as $layer) {
            $data['data']['Config Files'][] =
                array(ucfirst($layer) . ' Configuration File', 'Filename' ,
                    $config->getConfFile($layer));
        }

        $this->ui->outputData($data, 'config-show');
        return true;
    }

    /**
     * Checks if a layer is defined or not
     *
     * @param string $layer The layer to search for
     * @return mixed False on no error or the error message
     */
    function _checkLayer($layer = null)
    {
        if (!empty($layer) && $layer != 'default') {
            $layers = $this->config->getLayers();
            if (!in_array($layer, $layers)) {
                return " only the layers: \"" . implode('" or "', $layers) . "\" are supported";
            }
        }

        return false;
    }
}
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      <commands version="1.0">
 <config-show>
  <summary>Show All Settings</summary>
  <function>doConfigShow</function>
  <shortcut>csh</shortcut>
  <options>
   <channel>
    <shortopt>c</shortopt>
    <doc>show configuration variables for another channel</doc>
    <arg>CHAN</arg>
   </channel>
  </options>
  <doc>[layer]
Displays all configuration values.  An optional argument
may be used to tell which configuration layer to display.  Valid
configuration layers are &quot;user&quot;, &quot;system&quot; and &quot;default&quot;. To display
configurations for different channels, set the default_channel
configuration variable and run config-show again.
</doc>
 </config-show>
 <config-get>
  <summary>Show One Setting</summary>
  <function>doConfigGet</function>
  <shortcut>cg</shortcut>
  <options>
   <channel>
    <shortopt>c</shortopt>
    <doc>show configuration variables for another channel</doc>
    <arg>CHAN</arg>
   </channel>
  </options>
  <doc>&lt;parameter&gt; [layer]
Displays the value of one configuration parameter.  The
first argument is the name of the parameter, an optional second argument
may be used to tell which configuration layer to look in.  Valid configuration
layers are &quot;user&quot;, &quot;system&quot; and &quot;default&quot;.  If no layer is specified, a value
will be picked from the first layer that defines the parameter, in the order
just specified.  The configuration value will be retrieved for the channel
specified by the default_channel configuration variable.
</doc>
 </config-get>
 <config-set>
  <summary>Change Setting</summary>
  <function>doConfigSet</function>
  <shortcut>cs</shortcut>
  <options>
   <channel>
    <shortopt>c</shortopt>
    <doc>show configuration variables for another channel</doc>
    <arg>CHAN</arg>
   </channel>
  </options>
  <doc>&lt;parameter&gt; &lt;value&gt; [layer]
Sets the value of one configuration parameter.  The first argument is
the name of the parameter, the second argument is the new value.  Some
parameters are subject to validation, and the command will fail with
an error message if the new value does not make sense.  An optional
third argument may be used to specify in which layer to set the
configuration parameter.  The default layer is &quot;user&quot;.  The
configuration value will be set for the current channel, which
is controlled by the default_channel configuration variable.
</doc>
 </config-set>
 <config-help>
  <summary>Show Information About Setting</summary>
  <function>doConfigHelp</function>
  <shortcut>ch</shortcut>
  <options />
  <doc>[parameter]
Displays help for a configuration parameter.  Without arguments it
displays help for all configuration parameters.
</doc>
 </config-help>
 <config-create>
  <summary>Create a Default configuration file</summary>
  <function>doConfigCreate</function>
  <shortcut>coc</shortcut>
  <options>
   <windows>
    <shortopt>w</shortopt>
    <doc>create a config file for a windows install</doc>
   </windows>
  </options>
  <doc>&lt;root path&gt; &lt;filename&gt;
Create a default configuration file with all directory configuration
variables set to subdirectories of &lt;root path&gt;, and save it as &lt;filename&gt;.
This is useful especially for creating a configuration file for a remote
PEAR installation (using the --remoteconfig option of install, upgrade,
and uninstall).
</doc>
 </config-create>
</commands>                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          <?php
/**
 * PEAR_Command_Install (install, upgrade, upgrade-all, uninstall, bundle, run-scripts commands)
 *
 * PHP versions 4 and 5
 *
 * @category   pear
 * @package    PEAR
 * @author     Stig Bakken <ssb@php.net>
 * @author     Greg Beaver <cellog@php.net>
 * @copyright  1997-2009 The Authors
 * @license    http://opensource.org/licenses/bsd-license.php New BSD License
 * @link       http://pear.php.net/package/PEAR
 * @since      File available since Release 0.1
 */

/**
 * base class
 */
require_once 'PEAR/Command/Common.php';

/**
 * PEAR commands for installation or deinstallation/upgrading of
 * packages.
 *
 * @category   pear
 * @package    PEAR
 * @author     Stig Bakken <ssb@php.net>
 * @author     Greg Beaver <cellog@php.net>
 * @copyright  1997-2009 The Authors
 * @license    http://opensource.org/licenses/bsd-license.php New BSD License
 * @version    Release: 1.10.5
 * @link       http://pear.php.net/package/PEAR
 * @since      Class available since Release 0.1
 */
class PEAR_Command_Install extends PEAR_Command_Common
{
    // {{{ properties

    var $commands = array(
        'install' => array(
            'summary' => 'Install Package',
            'function' => 'doInstall',
            'shortcut' => 'i',
            'options' => array(
                'force' => array(
                    'shortopt' => 'f',
                    'doc' => 'will overwrite newer installed packages',
                    ),
                'loose' => array(
                    'shortopt' => 'l',
                    'doc' => 'do not check for recommended dependency version',
                    ),
                'nodeps' => array(
                    'shortopt' => 'n',
                    'doc' => 'ignore dependencies, install anyway',
                    ),
                'register-only' => array(
                    'shortopt' => 'r',
                    'doc' => 'do not install files, only register the package as installed',
                    ),
                'soft' => array(
                    'shortopt' => 's',
                    'doc' => 'soft install, fail silently, or upgrade if already installed',
                    ),
                'nobuild' => array(
                    'shortopt' => 'B',
                    'doc' => 'don\'t build C extensions',
                    ),
                'nocompress' => array(
                    'shortopt' => 'Z',
                    'doc' => 'request uncompressed files when downloading',
                    ),
                'installroot' => array(
                    'shortopt' => 'R',
                    'arg' => 'DIR',
                    'doc' => 'root directory used when installing files (ala PHP\'s INSTALL_ROOT), use packagingroot for RPM',
                    ),
                'packagingroot' => array(
                    'shortopt' => 'P',
                    'arg' => 'DIR',
                    'doc' => 'root directory used when packaging files, like RPM packaging',
                    ),
                'ignore-errors' => array(
                    'doc' => 'force install even if there were errors',
                    ),
                'alldeps' => array(
                    'shortopt' => 'a',
                    'doc' => 'install all required and optional dependencies',
                    ),
                'onlyreqdeps' => array(
                    'shortopt' => 'o',
                    'doc' => 'install all required dependencies',
                    ),
                'offline' => array(
                    'shortopt' => 'O',
                    'doc' => 'do not attempt to download any urls or contact channels',
                    ),
                'pretend' => array(
                    'shortopt' => 'p',
                    'doc' => 'Only list the packages that would be downloaded',
                    ),
                ),
            'doc' => '[channel/]<package> ...
Installs one or more PEAR packages.  You can specify a package to
install in four ways:

"Package-1.0.tgz" : installs from a local file

"http://example.com/Package-1.0.tgz" : installs from
anywhere on the net.

"package.xml" : installs the package described in
package.xml.  Useful for testing, or for wrapping a PEAR package in
another package manager such as RPM.

"Package[-version/state][.tar]" : queries your default channel\'s server
({config master_server}) and downloads the newest package with
the preferred quality/state ({config preferred_state}).

To retrieve Package version 1.1, use "Package-1.1," to retrieve
Package state beta, use "Package-beta."  To retrieve an uncompressed
file, append .tar (make sure there is no file by the same name first)

To download a package from another channel, prefix with the channel name like
"channel/Package"

More than one package may be specified at once.  It is ok to mix these
four ways of specifying packages.
'),
        'upgrade' => array(
            'summary' => 'Upgrade Package',
            'function' => 'doInstall',
            'shortcut' => 'up',
            'options' => array(
                'channel' => array(
                    'shortopt' => 'c',
                    'doc' => 'upgrade packages from a specific channel',
                    'arg' => 'CHAN',
                    ),
                'force' => array(
                    'shortopt' => 'f',
                    'doc' => 'overwrite newer installed packages',
                    ),
                'loose' => array(
                    'shortopt' => 'l',
                    'doc' => 'do not check for recommended dependency version',
                    ),
                'nodeps' => array(
                    'shortopt' => 'n',
                    'doc' => 'ignore dependencies, upgrade anyway',
                    ),
                'register-only' => array(
                    'shortopt' => 'r',
                    'doc' => 'do not install files, only register the package as upgraded',
                    ),
                'nobuild' => array(
                    'shortopt' => 'B',
                    'doc' => 'don\'t build C extensions',
                    ),
                'nocompress' => array(
                    'shortopt' => 'Z',
                    'doc' => 'request uncompressed files when downloading',
                    ),
                'installroot' => array(
                    'shortopt' => 'R',
                    'arg' => 'DIR',
                    'doc' => 'root directory used when installing files (ala PHP\'s INSTALL_ROOT)',
                    ),
                'ignore-errors' => array(
                    'doc' => 'force install even if there were errors',
                    ),
                'alldeps' => array(
                    'shortopt' => 'a',
                    'doc' => 'install all required and optional dependencies',
                    ),
                'onlyreqdeps' => array(
                    'shortopt' => 'o',
                    'doc' => 'install all required dependencies',
                    ),
                'offline' => array(
                    'shortopt' => 'O',
                    'doc' => 'do not attempt to download any urls or contact channels',
                    ),
                'pretend' => array(
                    'shortopt' => 'p',
                    'doc' => 'Only list the packages that would be downloaded',
                    ),
                ),
            'doc' => '<package> ...
Upgrades one or more PEAR packages.  See documentation for the
"install" command for ways to specify a package.

When upgrading, your package will be updated if the provided new
package has a higher version number (use the -f option if you need to
upgrade anyway).

More than one package may be specified at once.
'),
        'upgrade-all' => array(
            'summary' => 'Upgrade All Packages [Deprecated in favor of calling upgrade with no parameters]',
            'function' => 'doUpgradeAll',
            'shortcut' => 'ua',
            'options' => array(
                'channel' => array(
                    'shortopt' => 'c',
                    'doc' => 'upgrade packages from a specific channel',
                    'arg' => 'CHAN',
                    ),
                'nodeps' => array(
                    'shortopt' => 'n',
                    'doc' => 'ignore dependencies, upgrade anyway',
                    ),
                'register-only' => array(
                    'shortopt' => 'r',
                    'doc' => 'do not install files, only register the package as upgraded',
                    ),
                'nobuild' => array(
                    'shortopt' => 'B',
                    'doc' => 'don\'t build C extensions',
                    ),
                'nocompress' => array(
                    'shortopt' => 'Z',
                    'doc' => 'request uncompressed files when downloading',
                    ),
                'installroot' => array(
                    'shortopt' => 'R',
                    'arg' => 'DIR',
                    'doc' => 'root directory used when installing files (ala PHP\'s INSTALL_ROOT), use packagingroot for RPM',
                    ),
                'ignore-errors' => array(
                    'doc' => 'force install even if there were errors',
                    ),
                'loose' => array(
                    'doc' => 'do not check for recommended dependency version',
                    ),
                ),
            'doc' => '
WARNING: This function is deprecated in favor of using the upgrade command with no params

Upgrades all packages that have a newer release available.  Upgrades are
done only if there is a release available of the state specified in
"preferred_state" (currently {config preferred_state}), or a state considered
more stable.
'),
        'uninstall' => array(
            'summary' => 'Un-install Package',
            'function' => 'doUninstall',
            'shortcut' => 'un',
            'options' => array(
                'nodeps' => array(
                    'shortopt' => 'n',
                    'doc' => 'ignore dependencies, uninstall anyway',
                    ),
                'register-only' => array(
                    'shortopt' => 'r',
                    'doc' => 'do not remove files, only register the packages as not installed',
                    ),
                'installroot' => array(
                    'shortopt' => 'R',
                    'arg' => 'DIR',
                    'doc' => 'root directory used when installing files (ala PHP\'s INSTALL_ROOT)',
                    ),
                'ignore-errors' => array(
                    'doc' => 'force install even if there were errors',
                    ),
                'offline' => array(
                    'shortopt' => 'O',
                    'doc' => 'do not attempt to uninstall remotely',
                    ),
                ),
            'doc' => '[channel/]<package> ...
Uninstalls one or more PEAR packages.  More than one package may be
specified at once.  Prefix with channel name to uninstall from a
channel not in your default channel ({config default_channel})
'),
        'bundle' => array(
            'summary' => 'Unpacks a Pecl Package',
            'function' => 'doBundle',
            'shortcut' => 'bun',
            'options' => array(
                'destination' => array(
                   'shortopt' => 'd',
                    'arg' => 'DIR',
                    'doc' => 'Optional destination directory for unpacking (defaults to current path or "ext" if exists)',
                    ),
                'force' => array(
                    'shortopt' => 'f',
                    'doc' => 'Force the unpacking even if there were errors in the package',
                ),
            ),
            'doc' => '<package>
Unpacks a Pecl Package into the selected location. It will download the
package if needed.
'),
        'run-scripts' => array(
            'summary' => 'Run Post-Install Scripts bundled with a package',
            'function' => 'doRunScripts',
            'shortcut' => 'rs',
            'options' => array(
            ),
            'doc' => '<package>
Run post-installation scripts in package <package>, if any exist.
'),
    );

    // }}}
    // {{{ constructor

    /**
     * PEAR_Command_Install constructor.
     *
     * @access public
     */
    function __construct(&$ui, &$config)
    {
        parent::__construct($ui, $config);
    }

    // }}}

    /**
     * For unit testing purposes
     */
    function &getDownloader(&$ui, $options, &$config)
    {
        if (!class_exists('PEAR_Downloader')) {
            require_once 'PEAR/Downloader.php';
        }
        $a = new PEAR_Downloader($ui, $options, $config);
        return $a;
    }

    /**
     * For unit testing purposes
     */
    function &getInstaller(&$ui)
    {
        if (!class_exists('PEAR_Installer')) {
            require_once 'PEAR/Installer.php';
        }
        $a = new PEAR_Installer($ui);
        return $a;
    }

    function enableExtension($binaries, $type)
    {
        if (!($phpini = $this->config->get('php_ini', null, 'pear.php.net'))) {
            return PEAR::raiseError('configuration option "php_ini" is not set to php.ini location');
        }
        $ini = $this->_parseIni($phpini);
        if (PEAR::isError($ini)) {
            return $ini;
        }
        $line = 0;
        if ($type == 'extsrc' || $type == 'extbin') {
            $search = 'extensions';
            $enable = 'extension';
        } else {
            $search = 'zend_extensions';
            ob_start();
            phpinfo(INFO_GENERAL);
            $info = ob_get_contents();
            ob_end_clean();
            $debug = function_exists('leak') ? '_debug' : '';
            $ts = preg_match('/Thread Safety.+enabled/', $info) ? '_ts' : '';
            $enable = 'zend_extension' . $debug . $ts;
        }
        foreach ($ini[$search] as $line => $extension) {
            if (in_array($extension, $binaries, true) || in_array(
                  $ini['extension_dir'] . DIRECTORY_SEPARATOR . $extension, $binaries, true)) {
                // already enabled - assume if one is, all are
                return true;
            }
        }
        if ($line) {
            $newini = array_slice($ini['all'], 0, $line);
        } else {
            $newini = array();
        }
        foreach ($binaries as $binary) {
            if ($ini['extension_dir']) {
                $binary = basename($binary);
            }
            $newini[] = $enable . '="' . $binary . '"' . (OS_UNIX ? "\n" : "\r\n");
        }
        $newini = array_merge($newini, array_slice($ini['all'], $line));
        $fp = @fopen($phpini, 'wb');
        if (!$fp) {
            return PEAR::raiseError('cannot open php.ini "' . $phpini . '" for writing');
        }
        foreach ($newini as $line) {
            fwrite($fp, $line);
        }
        fclose($fp);
        return true;
    }

    function disableExtension($binaries, $type)
    {
        if (!($phpini = $this->config->get('php_ini', null, 'pear.php.net'))) {
            return PEAR::raiseError('configuration option "php_ini" is not set to php.ini location');
        }
        $ini = $this->_parseIni($phpini);
        if (PEAR::isError($ini)) {
            return $ini;
        }
        $line = 0;
        if ($type == 'extsrc' || $type == 'extbin') {
            $search = 'extensions';
            $enable = 'extension';
        } else {
            $search = 'zend_extensions';
            ob_start();
            phpinfo(INFO_GENERAL);
            $info = ob_get_contents();
            ob_end_clean();
            $debug = function_exists('leak') ? '_debug' : '';
            $ts = preg_match('/Thread Safety.+enabled/', $info) ? '_ts' : '';
            $enable = 'zend_extension' . $debug . $ts;
        }
        $found = false;
        foreach ($ini[$search] as $line => $extension) {
            if (in_array($extension, $binaries, true) || in_array(
                  $ini['extension_dir'] . DIRECTORY_SEPARATOR . $extension, $binaries, true)) {
                $found = true;
                break;
            }
        }
        if (!$found) {
            // not enabled
            return true;
        }
        $fp = @fopen($phpini, 'wb');
        if (!$fp) {
            return PEAR::raiseError('cannot open php.ini "' . $phpini . '" for writing');
        }
        if ($line) {
            $newini = array_slice($ini['all'], 0, $line);
            // delete the enable line
            $newini = array_merge($newini, array_slice($ini['all'], $line + 1));
        } else {
            $newini = array_slice($ini['all'], 1);
        }
        foreach ($newini as $line) {
            fwrite($fp, $line);
        }
        fclose($fp);
        return true;
    }

    function _parseIni($filename)
    {
        if (!file_exists($filename)) {
            return PEAR::raiseError('php.ini "' . $filename . '" does not exist');
        }

        if (filesize($filename) > 300000) {
            return PEAR::raiseError('php.ini "' . $filename . '" is too large, aborting');
        }

        ob_start();
        phpinfo(INFO_GENERAL);
        $info = ob_get_contents();
        ob_end_clean();
        $debug = function_exists('leak') ? '_debug' : '';
        $ts = preg_match('/Thread Safety.+enabled/', $info) ? '_ts' : '';
        $zend_extension_line = 'zend_extension' . $debug . $ts;
        $all = @file($filename);
        if ($all === false) {
            return PEAR::raiseError('php.ini "' . $filename .'" could not be read');
        }
        $zend_extensions = $extensions = array();
        // assume this is right, but pull from the php.ini if it is found
        $extension_dir = ini_get('extension_dir');
        foreach ($all as $linenum => $line) {
            $line = trim($line);
            if (!$line) {
                continue;
            }
            if ($line[0] == ';') {
                continue;
            }
            if (strtolower(substr($line, 0, 13)) == 'extension_dir') {
                $line = trim(substr($line, 13));
                if ($line[0] == '=') {
                    $x = trim(substr($line, 1));
                    $x = explode(';', $x);
                    $extension_dir = str_replace('"', '', array_shift($x));
                    continue;
                }
            }
            if (strtolower(substr($line, 0, 9)) == 'extension') {
                $line = trim(substr($line, 9));
                if ($line[0] == '=') {
                    $x = trim(substr($line, 1));
                    $x = explode(';', $x);
                    $extensions[$linenum] = str_replace('"', '', array_shift($x));
                    continue;
                }
            }
            if (strtolower(substr($line, 0, strlen($zend_extension_line))) ==
                  $zend_extension_line) {
                $line = trim(substr($line, strlen($zend_extension_line)));
                if ($line[0] == '=') {
                    $x = trim(substr($line, 1));
                    $x = explode(';', $x);
                    $zend_extensions[$linenum] = str_replace('"', '', array_shift($x));
                    continue;
                }
            }
        }
        return array(
            'extensions' => $extensions,
            'zend_extensions' => $zend_extensions,
            'extension_dir' => $extension_dir,
            'all' => $all,
        );
    }

    // {{{ doInstall()

    function doInstall($command, $options, $params)
    {
        if (!class_exists('PEAR_PackageFile')) {
            require_once 'PEAR/PackageFile.php';
        }

        if (isset($options['installroot']) && isset($options['packagingroot'])) {
            return $this->raiseError('ERROR: cannot use both --installroot and --packagingroot');
        }

        $reg = &$this->config->getRegistry();
        $channel = isset($options['channel']) ? $options['channel'] : $this->config->get('default_channel');
        if (!$reg->channelExists($channel)) {
            return $this->raiseError('Channel "' . $channel . '" does not exist');
        }

        if (empty($this->installer)) {
            $this->installer = &$this->getInstaller($this->ui);
        }

        if ($command == 'upgrade' || $command == 'upgrade-all') {
            // If people run the upgrade command but pass nothing, emulate a upgrade-all
            if ($command == 'upgrade' && empty($params)) {
                return $this->doUpgradeAll($command, $options, $params);
            }
            $options['upgrade'] = true;
        } else {
            $packages = $params;
        }

        $instreg = &$reg; // instreg used to check if package is installed
        if (isset($options['packagingroot']) && !isset($options['upgrade'])) {
            $packrootphp_dir = $this->installer->_prependPath(
                $this->config->get('php_dir', null, 'pear.php.net'),
                $options['packagingroot']);
            $metadata_dir = $this->config->get('metadata_dir', null, 'pear.php.net');
            if ($metadata_dir) {
                $metadata_dir = $this->installer->_prependPath(
                    $metadata_dir,
                    $options['packagingroot']);
            }
            $instreg = new PEAR_Registry($packrootphp_dir, false, false, $metadata_dir); // other instreg!

            if ($this->config->get('verbose') > 2) {
                $this->ui->outputData('using package root: ' . $options['packagingroot']);
            }
        }

        $abstractpackages = $otherpackages = array();
        // parse params
        PEAR::staticPushErrorHandling(PEAR_ERROR_RETURN);

        foreach ($params as $param) {
            if (strpos($param, 'http://') === 0) {
                $otherpackages[] = $param;
                continue;
            }

            if (strpos($param, 'channel://') === false && @file_exists($param)) {
                if (isset($options['force'])) {
                    $otherpackages[] = $param;
                    continue;
                }

                $pkg = new PEAR_PackageFile($this->config);
                $pf  = $pkg->fromAnyFile($param, PEAR_VALIDATE_DOWNLOADING);
                if (PEAR::isError($pf)) {
                    $otherpackages[] = $param;
                    continue;
                }

                $exists   = $reg->packageExists($pf->getPackage(), $pf->getChannel());
                $pversion = $reg->packageInfo($pf->getPackage(), 'version', $pf->getChannel());
                $version_compare = version_compare($pf->getVersion(), $pversion, '<=');
                if ($exists && $version_compare) {
                    if ($this->config->get('verbose')) {
                        $this->ui->outputData('Ignoring installed package ' .
                            $reg->parsedPackageNameToString(
                            array('package' => $pf->getPackage(),
                                  'channel' => $pf->getChannel()), true));
                    }
                    continue;
                }
                $otherpackages[] = $param;
                continue;
            }

            $e = $reg->parsePackageName($param, $channel);
            if (PEAR::isError($e)) {
                $otherpackages[] = $param;
            } else {
                $abstractpackages[] = $e;
            }
        }
        PEAR::staticPopErrorHandling();

        // if there are any local package .tgz or remote static url, we can't
        // filter.  The filter only works for abstract packages
        if (count($abstractpackages) && !isset($options['force'])) {
            // when not being forced, only do necessary upgrades/installs
            if (isset($options['upgrade'])) {
                $abstractpackages = $this->_filterUptodatePackages($abstractpackages, $command);
            } else {
                $count = count($abstractpackages);
                foreach ($abstractpackages as $i => $package) {
                    if (isset($package['group'])) {
                        // do not filter out install groups
                        continue;
                    }

                    if ($instreg->packageExists($package['package'], $package['channel'])) {
                        if ($count > 1) {
                            if ($this->config->get('verbose')) {
                                $this->ui->outputData('Ignoring installed package ' .
                                    $reg->parsedPackageNameToString($package, true));
                            }
                            unset($abstractpackages[$i]);
                        } elseif ($count === 1) {
                            // Lets try to upgrade it since it's already installed
                            $options['upgrade'] = true;
                        }
                    }
                }
            }
            $abstractpackages =
                array_map(array($reg, 'parsedPackageNameToString'), $abstractpackages);
        } elseif (count($abstractpackages)) {
            $abstractpackages =
                array_map(array($reg, 'parsedPackageNameToString'), $abstractpackages);
        }

        $packages = array_merge($abstractpackages, $otherpackages);
        if (!count($packages)) {
            $c = '';
            if (isset($options['channel'])){
                $c .= ' in channel "' . $options['channel'] . '"';
            }
            $this->ui->outputData('Nothing to ' . $command . $c);
            return true;
        }

        $this->downloader = &$this->getDownloader($this->ui, $options, $this->config);
        $errors = $downloaded = $binaries = array();
        $downloaded = &$this->downloader->download($packages);
        if (PEAR::isError($downloaded)) {
            return $this->raiseError($downloaded);
        }

        $errors = $this->downloader->getErrorMsgs();
        if (count($errors)) {
            $err = array();
            $err['data'] = array();
            foreach ($errors as $error) {
                if ($error !== null) {
                    $err['data'][] = array($error);
                }
            }

            if (!empty($err['data'])) {
                $err['headline'] = 'Install Errors';
                $this->ui->outputData($err);
            }

            if (!count($downloaded)) {
                return $this->raiseError("$command failed");
            }
        }

        $data = array(
            'headline' => 'Packages that would be Installed'
        );

        if (isset($options['pretend'])) {
            foreach ($downloaded as $package) {
                $data['data'][] = array($reg->parsedPackageNameToString($package->getParsedPackage()));
            }
            $this->ui->outputData($data, 'pretend');
            return true;
        }

        $this->installer->setOptions($options);
        $this->installer->sortPackagesForInstall($downloaded);
        if (PEAR::isError($err = $this->installer->setDownloadedPackages($downloaded))) {
            $this->raiseError($err->getMessage());
            return true;
        }

        $binaries = $extrainfo = array();
        foreach ($downloaded as $param) {
            PEAR::staticPushErrorHandling(PEAR_ERROR_RETURN);
            $info = $this->installer->install($param, $options);
            PEAR::staticPopErrorHandling();
            if (PEAR::isError($info)) {
                $oldinfo = $info;
                $pkg = &$param->getPackageFile();
                if ($info->getCode() != PEAR_INSTALLER_NOBINARY) {
                    if (!($info = $pkg->installBinary($this->installer))) {
                        return $this->raiseError('ERROR: ' .$oldinfo->getMessage());
                    }

                    // we just installed a different package than requested,
                    // let's change the param and info so that the rest of this works
                    $param = $info[0];
                    $info  = $info[1];
                }
            }

            if (!is_array($info)) {
                return $this->raiseError("$command failed");
            }

            if ($param->getPackageType() == 'extsrc' ||
                  $param->getPackageType() == 'extbin' ||
                  $param->getPackageType() == 'zendextsrc' ||
                  $param->getPackageType() == 'zendextbin'
            ) {
                $pkg = &$param->getPackageFile();
                if ($instbin = $pkg->getInstalledBinary()) {
                    $instpkg = &$instreg->getPackage($instbin, $pkg->getChannel());
                } else {
                    $instpkg = &$instreg->getPackage($pkg->getPackage(), $pkg->getChannel());
                }

                foreach ($instpkg->getFilelist() as $name => $atts) {
                    $pinfo = pathinfo($atts['installed_as']);
                    if (!isset($pinfo['extension']) ||
                          in_array($pinfo['extension'], array('c', 'h'))
                    ) {
                        continue; // make sure we don't match php_blah.h
                    }

                    if ((strpos($pinfo['basename'], 'php_') === 0 &&
                          $pinfo['extension'] == 'dll') ||
                          // most unices
                          $pinfo['extension'] == 'so' ||
                          // hp-ux
                          $pinfo['extension'] == 'sl') {
                        $binaries[] = array($atts['installed_as'], $pinfo);
                        break;
                    }
                }

                if (count($binaries)) {
                    foreach ($binaries as $pinfo) {
                        PEAR::staticPushErrorHandling(PEAR_ERROR_RETURN);
                        $ret = $this->enableExtension(array($pinfo[0]), $param->getPackageType());
                        PEAR::staticPopErrorHandling();
                        if (PEAR::isError($ret)) {
                            $extrainfo[] = $ret->getMessage();
                            if ($param->getPackageType() == 'extsrc' ||
                                  $param->getPackageType() == 'extbin') {
                                $exttype = 'extension';
                                $extpath = $pinfo[1]['basename'];
                            } else {
                                $exttype = 'zend_extension';
                                $extpath = $atts['installed_as'];
                            }
                            $extrainfo[] = 'You should add "' . $exttype . '=' .
                                $extpath . '" to php.ini';
                        } else {
                            $extrainfo[] = 'Extension ' . $instpkg->getProvidesExtension() .
                                ' enabled in php.ini';
                        }
                    }
                }
            }

            if ($this->config->get('verbose') > 0) {
                $chan = $param->getChannel();
                $label = $reg->parsedPackageNameToString(
                    array(
                        'channel' => $chan,
                        'package' => $param->getPackage(),
                        'version' => $param->getVersion(),
                    ));
                $out = array('data' => "$command ok: $label");
                if (isset($info['release_warnings'])) {
                    $out['release_warnings'] = $info['release_warnings'];
                }
                $this->ui->outputData($out, $command);

                if (!isset($options['register-only']) && !isset($options['offline'])) {
                    if ($this->config->isDefinedLayer('ftp')) {
                        PEAR::staticPushErrorHandling(PEAR_ERROR_RETURN);
                        $info = $this->installer->ftpInstall($param);
                        PEAR::staticPopErrorHandling();
                        if (PEAR::isError($info)) {
                            $this->ui->outputData($info->getMessage());
                            $this->ui->outputData("remote install failed: $label");
                        } else {
                            $this->ui->outputData("remote install ok: $label");
                        }
                    }
                }
            }

            $deps = $param->getDeps();
            if ($deps) {
                if (isset($deps['group'])) {
                    $groups = $deps['group'];
                    if (!isset($groups[0])) {
                        $groups = array($groups);
                    }

                    foreach ($groups as $group) {
                        if ($group['attribs']['name'] == 'default') {
                            // default group is always installed, unless the user
                            // explicitly chooses to install another group
                            continue;
                        }
                        $extrainfo[] = $param->getPackage() . ': Optional feature ' .
                            $group['attribs']['name'] . ' available (' .
                            $group['attribs']['hint'] . ')';
                    }

                    $extrainfo[] = $param->getPackage() .
                        ': To install optional features use "pear install ' .
                        $reg->parsedPackageNameToString(
                            array('package' => $param->getPackage(),
                                  'channel' => $param->getChannel()), true) .
                              '#featurename"';
                }
            }

            $pkg = &$instreg->getPackage($param->getPackage(), $param->getChannel());
            // $pkg may be NULL if install is a 'fake' install via --packagingroot
            if (is_object($pkg)) {
                $pkg->setConfig($this->config);
                if ($list = $pkg->listPostinstallScripts()) {
                    $pn = $reg->parsedPackageNameToString(array('channel' =>
                       $param->getChannel(), 'package' => $param->getPackage()), true);
                    $extrainfo[] = $pn . ' has post-install scripts:';
                    foreach ($list as $file) {
                        $extrainfo[] = $file;
                    }
                    $extrainfo[] = $param->getPackage() .
                        ': Use "pear run-scripts ' . $pn . '" to finish setup.';
                    $extrainfo[] = 'DO NOT RUN SCRIPTS FROM UNTRUSTED SOURCES';
                }
            }
        }

        if (count($extrainfo)) {
            foreach ($extrainfo as $info) {
                $this->ui->outputData($info);
            }
        }

        return true;
    }

    // }}}
    // {{{ doUpgradeAll()

    function doUpgradeAll($command, $options, $params)
    {
        $reg = &$this->config->getRegistry();
        $upgrade = array();

        if (isset($options['channel'])) {
            $channels = array($options['channel']);
        } else {
            $channels = $reg->listChannels();
        }

        foreach ($channels as $channel) {
            if ($channel == '__uri') {
                continue;
            }

            // parse name with channel
            foreach ($reg->listPackages($channel) as $name) {
                $upgrade[] = $reg->parsedPackageNameToString(array(
                        'channel' => $channel,
                        'package' => $name
                    ));
            }
        }

        $err = $this->doInstall($command, $options, $upgrade);
        if (PEAR::isError($err)) {
            $this->ui->outputData($err->getMessage(), $command);
        }
   }

    // }}}
    // {{{ doUninstall()

    function doUninstall($command, $options, $params)
    {
        if (count($params) < 1) {
            return $this->raiseError("Please supply the package(s) you want to uninstall");
        }

        if (empty($this->installer)) {
            $this->installer = &$this->getInstaller($this->ui);
        }

        if (isset($options['remoteconfig'])) {
            $e = $this->config->readFTPConfigFile($options['remoteconfig']);
            if (!PEAR::isError($e)) {
                $this->installer->setConfig($this->config);
            }
        }

        $reg = &$this->config->getRegistry();
        $newparams = array();
        $binaries = array();
        $badparams = array();
        foreach ($params as $pkg) {
            $channel = $this->config->get('default_channel');
            PEAR::staticPushErrorHandling(PEAR_ERROR_RETURN);
            $parsed = $reg->parsePackageName($pkg, $channel);
            PEAR::staticPopErrorHandling();
            if (!$parsed || PEAR::isError($parsed)) {
                $badparams[] = $pkg;
                continue;
            }
            $package = $parsed['package'];
            $channel = $parsed['channel'];
            $info = &$reg->getPackage($package, $channel);
            if ($info === null &&
                 ($channel == 'pear.php.net' || $channel == 'pecl.php.net')) {
                // make sure this isn't a package that has flipped from pear to pecl but
                // used a package.xml 1.0
                $testc = ($channel == 'pear.php.net') ? 'pecl.php.net' : 'pear.php.net';
                $info = &$reg->getPackage($package, $testc);
                if ($info !== null) {
                    $channel = $testc;
                }
            }
            if ($info === null) {
                $badparams[] = $pkg;
            } else {
                $newparams[] = &$info;
                // check for binary packages (this is an alias for those packages if so)
                if ($installedbinary = $info->getInstalledBinary()) {
                    $this->ui->log('adding binary package ' .
                        $reg->parsedPackageNameToString(array('channel' => $channel,
                            'package' => $installedbinary), true));
                    $newparams[] = &$reg->getPackage($installedbinary, $channel);
                }
                // add the contents of a dependency group to the list of installed packages
                if (isset($parsed['group'])) {
                    $group = $info->getDependencyGroup($parsed['group']);
                    if ($group) {
                        $installed = $reg->getInstalledGroup($group);
                        if ($installed) {
                            foreach ($installed as $i => $p) {
                                $newparams[] = &$installed[$i];
                            }
                        }
                    }
                }
            }
        }
        $err = $this->installer->sortPackagesForUninstall($newparams);
        if (PEAR::isError($err)) {
            $this->ui->outputData($err->getMessage(), $command);
            return true;
        }
        $params = $newparams;
        // twist this to use it to check on whether dependent packages are also being uninstalled
        // for circular dependencies like subpackages
        $this->installer->setUninstallPackages($newparams);
        $params = array_merge($params, $badparams);
        $binaries = array();
        foreach ($params as $pkg) {
            $this->installer->pushErrorHandling(PEAR_ERROR_RETURN);
            if ($err = $this->installer->uninstall($pkg, $options)) {
                $this->installer->popErrorHandling();
                if (PEAR::isError($err)) {
                    $this->ui->outputData($err->getMessage(), $command);
                    continue;
                }
                if ($pkg->getPackageType() == 'extsrc' ||
                      $pkg->getPackageType() == 'extbin' ||
                      $pkg->getPackageType() == 'zendextsrc' ||
                      $pkg->getPackageType() == 'zendextbin') {
                    if ($instbin = $pkg->getInstalledBinary()) {
                        continue; // this will be uninstalled later
                    }

                    foreach ($pkg->getFilelist() as $name => $atts) {
                        $pinfo = pathinfo($atts['installed_as']);
                        if (!isset($pinfo['extension']) ||
                              in_array($pinfo['extension'], array('c', 'h'))) {
                            continue; // make sure we don't match php_blah.h
                        }
                        if ((strpos($pinfo['basename'], 'php_') === 0 &&
                              $pinfo['extension'] == 'dll') ||
                              // most unices
                              $pinfo['extension'] == 'so' ||
                              // hp-ux
                              $pinfo['extension'] == 'sl') {
                            $binaries[] = array($atts['installed_as'], $pinfo);
                            break;
                        }
                    }
                    if (count($binaries)) {
                        foreach ($binaries as $pinfo) {
                            PEAR::staticPushErrorHandling(PEAR_ERROR_RETURN);
                            $ret = $this->disableExtension(array($pinfo[0]), $pkg->getPackageType());
                            PEAR::staticPopErrorHandling();
                            if (PEAR::isError($ret)) {
                                $extrainfo[] = $ret->getMessage();
                                if ($pkg->getPackageType() == 'extsrc' ||
                                      $pkg->getPackageType() == 'extbin') {
                                    $exttype = 'extension';
                                } else {
                                    ob_start();
                                    phpinfo(INFO_GENERAL);
                                    $info = ob_get_contents();
                                    ob_end_clean();
                                    $debug = function_exists('leak') ? '_debug' : '';
                                    $ts = preg_match('/Thread Safety.+enabled/', $info) ? '_ts' : '';
                                    $exttype = 'zend_extension' . $debug . $ts;
                                }
                                $this->ui->outputData('Unable to remove "' . $exttype . '=' .
                                    $pinfo[1]['basename'] . '" from php.ini', $command);
                            } else {
                                $this->ui->outputData('Extension ' . $pkg->getProvidesExtension() .
                                    ' disabled in php.ini', $command);
                            }
                        }
                    }
                }
                $savepkg = $pkg;
                if ($this->config->get('verbose') > 0) {
                    if (is_object($pkg)) {
                        $pkg = $reg->parsedPackageNameToString($pkg);
                    }
                    $this->ui->outputData("uninstall ok: $pkg", $command);
                }
                if (!isset($options['offline']) && is_object($savepkg) &&
                      defined('PEAR_REMOTEINSTALL_OK')) {
                    if ($this->config->isDefinedLayer('ftp')) {
                        $this->installer->pushErrorHandling(PEAR_ERROR_RETURN);
                        $info = $this->installer->ftpUninstall($savepkg);
                        $this->installer->popErrorHandling();
                        if (PEAR::isError($info)) {
                            $this->ui->outputData($info->getMessage());
                            $this->ui->outputData("remote uninstall failed: $pkg");
                        } else {
                            $this->ui->outputData("remote uninstall ok: $pkg");
                        }
                    }
                }
            } else {
                $this->installer->popErrorHandling();
                if (!is_object($pkg)) {
                    return $this->raiseError("uninstall failed: $pkg");
                }
                $pkg = $reg->parsedPackageNameToString($pkg);
            }
        }

        return true;
    }

    // }}}


    // }}}
    // {{{ doBundle()
    /*
    (cox) It just downloads and untars the package, does not do
            any check that the PEAR_Installer::_installFile() does.
    */

    function doBundle($command, $options, $params)
    {
        $opts = array(
            'force'        => true,
            'nodeps'       => true,
            'soft'         => true,
            'downloadonly' => true
        );
        $downloader = &$this->getDownloader($this->ui, $opts, $this->config);
        $reg = &$this->config->getRegistry();
        if (count($params) < 1) {
            return $this->raiseError("Please supply the package you want to bundle");
        }

        if (isset($options['destination'])) {
            if (!is_dir($options['destination'])) {
                System::mkdir('-p ' . $options['destination']);
            }
            $dest = realpath($options['destination']);
        } else {
            $pwd  = getcwd();
            $dir  = $pwd . DIRECTORY_SEPARATOR . 'ext';
            $dest = is_dir($dir) ? $dir : $pwd;
        }
        PEAR::staticPushErrorHandling(PEAR_ERROR_RETURN);
        $err = $downloader->setDownloadDir($dest);
        PEAR::staticPopErrorHandling();
        if (PEAR::isError($err)) {
            return PEAR::raiseError('download directory "' . $dest .
                '" is not writeable.');
        }
        $result = &$downloader->download(array($params[0]));
        if (PEAR::isError($result)) {
            return $result;
        }
        if (!isset($result[0])) {
            return $this->raiseError('unable to unpack ' . $params[0]);
        }
        $pkgfile = &$result[0]->getPackageFile();
        $pkgname = $pkgfile->getName();
        $pkgversion = $pkgfile->getVersion();

        // Unpacking -------------------------------------------------
        $dest .= DIRECTORY_SEPARATOR . $pkgname;
        $orig = $pkgname . '-' . $pkgversion;

        $tar = new Archive_Tar($pkgfile->getArchiveFile());
        if (!$tar->extractModify($dest, $orig)) {
            return $this->raiseError('unable to unpack ' . $pkgfile->getArchiveFile());
        }
        $this->ui->outputData("Package ready at '$dest'");
    // }}}
    }

    // }}}

    function doRunScripts($command, $options, $params)
    {
        if (!isset($params[0])) {
            return $this->raiseError('run-scripts expects 1 parameter: a package name');
        }

        $reg = &$this->config->getRegistry();
        PEAR::staticPushErrorHandling(PEAR_ERROR_RETURN);
        $parsed = $reg->parsePackageName($params[0], $this->config->get('default_channel'));
        PEAR::staticPopErrorHandling();
        if (PEAR::isError($parsed)) {
            return $this->raiseError($parsed);
        }

        $package = &$reg->getPackage($parsed['package'], $parsed['channel']);
        if (!is_object($package)) {
            return $this->raiseError('Could not retrieve package "' . $params[0] . '" from registry');
        }

        $package->setConfig($this->config);
        $package->runPostinstallScripts();
        $this->ui->outputData('Install scripts complete', $command);
        return true;
    }

    /**
     * Given a list of packages, filter out those ones that are already up to date
     *
     * @param $packages: packages, in parsed array format !
     * @return list of packages that can be upgraded
     */
    function _filterUptodatePackages($packages, $command)
    {
        $reg = &$this->config->getRegistry();
        $latestReleases = array();

        $ret = array();
        foreach ($packages as $package) {
            if (isset($package['group'])) {
                $ret[] = $package;
                continue;
            }

            $channel = $package['channel'];
            $name    = $package['package'];
            if (!$reg->packageExists($name, $channel)) {
                $ret[] = $package;
                continue;
            }

            if (!isset($latestReleases[$channel])) {
                // fill in cache for this channel
                $chan = $reg->getChannel($channel);
                if (PEAR::isError($chan)) {
                    return $this->raiseError($chan);
                }

                $base2 = false;
                $preferred_mirror = $this->config->get('preferred_mirror', null, $channel);
                if ($chan->supportsREST($preferred_mirror) &&
                    (
                       //($base2 = $chan->getBaseURL('REST1.4', $preferred_mirror)) ||
                       ($base  = $chan->getBaseURL('REST1.0', $preferred_mirror))
                    )
                ) {
                    $dorest = true;
                }

                PEAR::staticPushErrorHandling(PEAR_ERROR_RETURN);
                if (!isset($package['state'])) {
                    $state = $this->config->get('preferred_state', null, $channel);
                } else {
                    $state = $package['state'];
                }

                if ($dorest) {
                    if ($base2) {
                        $rest = &$this->config->getREST('1.4', array());
                        $base = $base2;
                    } else {
                        $rest = &$this->config->getREST('1.0', array());
                    }

                    $installed = array_flip($reg->listPackages($channel));
                    $latest    = $rest->listLatestUpgrades($base, $state, $installed, $channel, $reg);
                }

                PEAR::staticPopErrorHandling();
                if (PEAR::isError($latest)) {
                    $this->ui->outputData('Error getting channel info from ' . $channel .
                        ': ' . $latest->getMessage());
                    continue;
                }

                $latestReleases[$channel] = array_change_key_case($latest);
            }

            // check package for latest release
            $name_lower = strtolower($name);
            if (isset($latestReleases[$channel][$name_lower])) {
                // if not set, up to date
                $inst_version    = $reg->packageInfo($name, 'version', $channel);
                $channel_version = $latestReleases[$channel][$name_lower]['version'];
                if (version_compare($channel_version, $inst_version, 'le')) {
                    // installed version is up-to-date
                    continue;
                }

                // maintain BC
                if ($command == 'upgrade-all') {
                    $this->ui->outputData(array('data' => 'Will upgrade ' .
                        $reg->parsedPackageNameToString($package)), $command);
                }
                $ret[] = $package;
            }
        }

        return $ret;
    }
}
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         <commands version="1.0">
 <install>
  <summary>Install Package</summary>
  <function>doInstall</function>
  <shortcut>i</shortcut>
  <options>
   <force>
    <shortopt>f</shortopt>
    <doc>will overwrite newer installed packages</doc>
   </force>
   <loose>
    <shortopt>l</shortopt>
    <doc>do not check for recommended dependency version</doc>
   </loose>
   <nodeps>
    <shortopt>n</shortopt>
    <doc>ignore dependencies, install anyway</doc>
   </nodeps>
   <register-only>
    <shortopt>r</shortopt>
    <doc>do not install files, only register the package as installed</doc>
   </register-only>
   <soft>
    <shortopt>s</shortopt>
    <doc>soft install, fail silently, or upgrade if already installed</doc>
   </soft>
   <nobuild>
    <shortopt>B</shortopt>
    <doc>don&#039;t build C extensions</doc>
   </nobuild>
   <nocompress>
    <shortopt>Z</shortopt>
    <doc>request uncompressed files when downloading</doc>
   </nocompress>
   <installroot>
    <shortopt>R</shortopt>
    <doc>root directory used when installing files (ala PHP&#039;s INSTALL_ROOT), use packagingroot for RPM</doc>
    <arg>DIR</arg>
   </installroot>
   <packagingroot>
    <shortopt>P</shortopt>
    <doc>root directory used when packaging files, like RPM packaging</doc>
    <arg>DIR</arg>
   </packagingroot>
   <ignore-errors>
    <shortopt></shortopt>
    <doc>force install even if there were errors</doc>
   </ignore-errors>
   <alldeps>
    <shortopt>a</shortopt>
    <doc>install all required and optional dependencies</doc>
   </alldeps>
   <onlyreqdeps>
    <shortopt>o</shortopt>
    <doc>install all required dependencies</doc>
   </onlyreqdeps>
   <offline>
    <shortopt>O</shortopt>
    <doc>do not attempt to download any urls or contact channels</doc>
   </offline>
   <pretend>
    <shortopt>p</shortopt>
    <doc>Only list the packages that would be downloaded</doc>
   </pretend>
  </options>
  <doc>[channel/]&lt;package&gt; ...
Installs one or more PEAR packages.  You can specify a package to
install in four ways:

&quot;Package-1.0.tgz&quot; : installs from a local file

&quot;http://example.com/Package-1.0.tgz&quot; : installs from
anywhere on the net.

&quot;package.xml&quot; : installs the package described in
package.xml.  Useful for testing, or for wrapping a PEAR package in
another package manager such as RPM.

&quot;Package[-version/state][.tar]&quot; : queries your default channel&#039;s server
({config master_server}) and downloads the newest package with
the preferred quality/state ({config preferred_state}).

To retrieve Package version 1.1, use &quot;Package-1.1,&quot; to retrieve
Package state beta, use &quot;Package-beta.&quot;  To retrieve an uncompressed
file, append .tar (make sure there is no file by the same name first)

To download a package from another channel, prefix with the channel name like
&quot;channel/Package&quot;

More than one package may be specified at once.  It is ok to mix these
four ways of specifying packages.
</doc>
 </install>
 <upgrade>
  <summary>Upgrade Package</summary>
  <function>doInstall</function>
  <shortcut>up</shortcut>
  <options>
   <channel>
    <shortopt>c</shortopt>
    <doc>upgrade packages from a specific channel</doc>
    <arg>CHAN</arg>
   </channel>
   <force>
    <shortopt>f</shortopt>
    <doc>overwrite newer installed packages</doc>
   </force>
   <loose>
    <shortopt>l</shortopt>
    <doc>do not check for recommended dependency version</doc>
   </loose>
   <nodeps>
    <shortopt>n</shortopt>
    <doc>ignore dependencies, upgrade anyway</doc>
   </nodeps>
   <register-only>
    <shortopt>r</shortopt>
    <doc>do not install files, only register the package as upgraded</doc>
   </register-only>
   <nobuild>
    <shortopt>B</shortopt>
    <doc>don&#039;t build C extensions</doc>
   </nobuild>
   <nocompress>
    <shortopt>Z</shortopt>
    <doc>request uncompressed files when downloading</doc>
   </nocompress>
   <installroot>
    <shortopt>R</shortopt>
    <doc>root directory used when installing files (ala PHP&#039;s INSTALL_ROOT)</doc>
    <arg>DIR</arg>
   </installroot>
   <ignore-errors>
    <shortopt></shortopt>
    <doc>force install even if there were errors</doc>
   </ignore-errors>
   <alldeps>
    <shortopt>a</shortopt>
    <doc>install all required and optional dependencies</doc>
   </alldeps>
   <onlyreqdeps>
    <shortopt>o</shortopt>
    <doc>install all required dependencies</doc>
   </onlyreqdeps>
   <offline>
    <shortopt>O</shortopt>
    <doc>do not attempt to download any urls or contact channels</doc>
   </offline>
   <pretend>
    <shortopt>p</shortopt>
    <doc>Only list the packages that would be downloaded</doc>
   </pretend>
  </options>
  <doc>&lt;package&gt; ...
Upgrades one or more PEAR packages.  See documentation for the
&quot;install&quot; command for ways to specify a package.

When upgrading, your package will be updated if the provided new
package has a higher version number (use the -f option if you need to
upgrade anyway).

More than one package may be specified at once.
</doc>
 </upgrade>
 <upgrade-all>
  <summary>Upgrade All Packages [Deprecated in favor of calling upgrade with no parameters]</summary>
  <function>doUpgradeAll</function>
  <shortcut>ua</shortcut>
  <options>
   <channel>
    <shortopt>c</shortopt>
    <doc>upgrade packages from a specific channel</doc>
    <arg>CHAN</arg>
   </channel>
   <nodeps>
    <shortopt>n</shortopt>
    <doc>ignore dependencies, upgrade anyway</doc>
   </nodeps>
   <register-only>
    <shortopt>r</shortopt>
    <doc>do not install files, only register the package as upgraded</doc>
   </register-only>
   <nobuild>
    <shortopt>B</shortopt>
    <doc>don&#039;t build C extensions</doc>
   </nobuild>
   <nocompress>
    <shortopt>Z</shortopt>
    <doc>request uncompressed files when downloading</doc>
   </nocompress>
   <installroot>
    <shortopt>R</shortopt>
    <doc>root directory used when installing files (ala PHP&#039;s INSTALL_ROOT), use packagingroot for RPM</doc>
    <arg>DIR</arg>
   </installroot>
   <ignore-errors>
    <shortopt></shortopt>
    <doc>force install even if there were errors</doc>
   </ignore-errors>
   <loose>
    <shortopt></shortopt>
    <doc>do not check for recommended dependency version</doc>
   </loose>
  </options>
  <doc>
WARNING: This function is deprecated in favor of using the upgrade command with no params

Upgrades all packages that have a newer release available.  Upgrades are
done only if there is a release available of the state specified in
&quot;preferred_state&quot; (currently {config preferred_state}), or a state considered
more stable.
</doc>
 </upgrade-all>
 <uninstall>
  <summary>Un-install Package</summary>
  <function>doUninstall</function>
  <shortcut>un</shortcut>
  <options>
   <nodeps>
    <shortopt>n</shortopt>
    <doc>ignore dependencies, uninstall anyway</doc>
   </nodeps>
   <register-only>
    <shortopt>r</shortopt>
    <doc>do not remove files, only register the packages as not installed</doc>
   </register-only>
   <installroot>
    <shortopt>R</shortopt>
    <doc>root directory used when installing files (ala PHP&#039;s INSTALL_ROOT)</doc>
    <arg>DIR</arg>
   </installroot>
   <ignore-errors>
    <shortopt></shortopt>
    <doc>force install even if there were errors</doc>
   </ignore-errors>
   <offline>
    <shortopt>O</shortopt>
    <doc>do not attempt to uninstall remotely</doc>
   </offline>
  </options>
  <doc>[channel/]&lt;package&gt; ...
Uninstalls one or more PEAR packages.  More than one package may be
specified at once.  Prefix with channel name to uninstall from a
channel not in your default channel ({config default_channel})
</doc>
 </uninstall>
 <bundle>
  <summary>Unpacks a Pecl Package</summary>
  <function>doBundle</function>
  <shortcut>bun</shortcut>
  <options>
   <destination>
    <shortopt>d</shortopt>
    <doc>Optional destination directory for unpacking (defaults to current path or &quot;ext&quot; if exists)</doc>
    <arg>DIR</arg>
   </destination>
   <force>
    <shortopt>f</shortopt>
    <doc>Force the unpacking even if there were errors in the package</doc>
   </force>
  </options>
  <doc>&lt;package&gt;
Unpacks a Pecl Package into the selected location. It will download the
package if needed.
</doc>
 </bundle>
 <run-scripts>
  <summary>Run Post-Install Scripts bundled with a package</summary>
  <function>doRunScripts</function>
  <shortcut>rs</shortcut>
  <options />
  <doc>&lt;package&gt;
Run post-installation scripts in package &lt;package&gt;, if any exist.
</doc>
 </run-scripts>
</commands>                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  <?php
/**
 * PEAR_Command_Mirror (download-all command)
 *
 * PHP versions 4 and 5
 *
 * @category   pear
 * @package    PEAR
 * @author     Alexander Merz <alexmerz@php.net>
 * @copyright  1997-2009 The Authors
 * @license    http://opensource.org/licenses/bsd-license.php New BSD License
 * @link       http://pear.php.net/package/PEAR
 * @since      File available since Release 1.2.0
 */

/**
 * base class
 */
require_once 'PEAR/Command/Common.php';

/**
 * PEAR commands for providing file mirrors
 *
 * @category   pear
 * @package    PEAR
 * @author     Alexander Merz <alexmerz@php.net>
 * @copyright  1997-2009 The Authors
 * @license    http://opensource.org/licenses/bsd-license.php New BSD License
 * @version    Release: 1.10.5
 * @link       http://pear.php.net/package/PEAR
 * @since      Class available since Release 1.2.0
 */
class PEAR_Command_Mirror extends PEAR_Command_Common
{
    var $commands = array(
        'download-all' => array(
            'summary' => 'Downloads each available package from the default channel',
            'function' => 'doDownloadAll',
            'shortcut' => 'da',
            'options' => array(
                'channel' =>
                    array(
                    'shortopt' => 'c',
                    'doc' => 'specify a channel other than the default channel',
                    'arg' => 'CHAN',
                    ),
                ),
            'doc' => '
Requests a list of available packages from the default channel ({config default_channel})
and downloads them to current working directory.  Note: only
packages within preferred_state ({config preferred_state}) will be downloaded'
            ),
        );

    /**
     * PEAR_Command_Mirror constructor.
     *
     * @access public
     * @param object PEAR_Frontend a reference to an frontend
     * @param object PEAR_Config a reference to the configuration data
     */
    function __construct(&$ui, &$config)
    {
        parent::__construct($ui, $config);
    }

    /**
     * For unit-testing
     */
    function &factory($a)
    {
        $a = &PEAR_Command::factory($a, $this->config);
        return $a;
    }

    /**
    * retrieves a list of avaible Packages from master server
    * and downloads them
    *
    * @access public
    * @param string $command the command
    * @param array $options the command options before the command
    * @param array $params the stuff after the command name
    * @return bool true if successful
    * @throw PEAR_Error
    */
    function doDownloadAll($command, $options, $params)
    {
        $savechannel = $this->config->get('default_channel');
        $reg = &$this->config->getRegistry();
        $channel = isset($options['channel']) ? $options['channel'] :
            $this->config->get('default_channel');
        if (!$reg->channelExists($channel)) {
            $this->config->set('default_channel', $savechannel);
            return $this->raiseError('Channel "' . $channel . '" does not exist');
        }
        $this->config->set('default_channel', $channel);

        $this->ui->outputData('Using Channel ' . $this->config->get('default_channel'));
        $chan = $reg->getChannel($channel);
        if (PEAR::isError($chan)) {
            return $this->raiseError($chan);
        }

        if ($chan->supportsREST($this->config->get('preferred_mirror')) &&
              $base = $chan->getBaseURL('REST1.0', $this->config->get('preferred_mirror'))) {
            $rest = &$this->config->getREST('1.0', array());
            $remoteInfo = array_flip($rest->listPackages($base, $channel));
        }

        if (PEAR::isError($remoteInfo)) {
            return $remoteInfo;
        }

        $cmd = &$this->factory("download");
        if (PEAR::isError($cmd)) {
            return $cmd;
        }

        $this->ui->outputData('Using Preferred State of ' .
            $this->config->get('preferred_state'));
        $this->ui->outputData('Gathering release information, please wait...');

        /**
         * Error handling not necessary, because already done by
         * the download command
         */
        PEAR::staticPushErrorHandling(PEAR_ERROR_RETURN);
        $err = $cmd->run('download', array('downloadonly' => true), array_keys($remoteInfo));
        PEAR::staticPopErrorHandling();
        $this->config->set('default_channel', $savechannel);
        if (PEAR::isError($err)) {
            $this->ui->outputData($err->getMessage());
        }

        return true;
    }
}
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   <commands version="1.0">
 <download-all>
  <summary>Downloads each available package from the default channel</summary>
  <function>doDownloadAll</function>
  <shortcut>da</shortcut>
  <options>
   <channel>
    <shortopt>c</shortopt>
    <doc>specify a channel other than the default channel</doc>
    <arg>CHAN</arg>
   </channel>
  </options>
  <doc>
Requests a list of available packages from the default channel ({config default_channel})
and downloads them to current working directory.  Note: only
packages within preferred_state ({config preferred_state}) will be downloaded</doc>
 </download-all>
</commands>                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       <?php
/**
 * PEAR_Command_Package (package, package-validate, cvsdiff, cvstag, package-dependencies,
 * sign, makerpm, convert commands)
 *
 * PHP versions 4 and 5
 *
 * @category   pear
 * @package    PEAR
 * @author     Stig Bakken <ssb@php.net>
 * @author     Martin Jansen <mj@php.net>
 * @author     Greg Beaver <cellog@php.net>
 * @copyright  1997-2009 The Authors
 * @license    http://opensource.org/licenses/bsd-license.php New BSD License
 * @link       http://pear.php.net/package/PEAR
 * @since      File available since Release 0.1
 */

/**
 * base class
 */
require_once 'PEAR/Command/Common.php';

/**
 * PEAR commands for login/logout
 *
 * @category   pear
 * @package    PEAR
 * @author     Stig Bakken <ssb@php.net>
 * @author     Martin Jansen <mj@php.net>
 * @author     Greg Beaver <cellog@php.net>
 * @copyright  1997-2009 The Authors
 * @license    http://opensource.org/licenses/bsd-license.php New BSD License
 * @version    Release: 1.10.5
 * @link       http://pear.php.net/package/PEAR
 * @since      Class available since Release 0.1
 */

class PEAR_Command_Package extends PEAR_Command_Common
{
    var $commands = array(
        'package' => array(
            'summary' => 'Build Package',
            'function' => 'doPackage',
            'shortcut' => 'p',
            'options' => array(
                'nocompress' => array(
                    'shortopt' => 'Z',
                    'doc' => 'Do not gzip the package file'
                    ),
                'showname' => array(
                    'shortopt' => 'n',
                    'doc' => 'Print the name of the packaged file.',
                    ),
                ),
            'doc' => '[descfile] [descfile2]
Creates a PEAR package from its description file (usually called
package.xml).  If a second packagefile is passed in, then
the packager will check to make sure that one is a package.xml
version 1.0, and the other is a package.xml version 2.0.  The
package.xml version 1.0 will be saved as "package.xml" in the archive,
and the other as "package2.xml" in the archive"
'
            ),
        'package-validate' => array(
            'summary' => 'Validate Package Consistency',
            'function' => 'doPackageValidate',
            'shortcut' => 'pv',
            'options' => array(),
            'doc' => '
',
            ),
        'cvsdiff' => array(
            'summary' => 'Run a "cvs diff" for all files in a package',
            'function' => 'doCvsDiff',
            'shortcut' => 'cd',
            'options' => array(
                'quiet' => array(
                    'shortopt' => 'q',
                    'doc' => 'Be quiet',
                    ),
                'reallyquiet' => array(
                    'shortopt' => 'Q',
                    'doc' => 'Be really quiet',
                    ),
                'date' => array(
                    'shortopt' => 'D',
                    'doc' => 'Diff against revision of DATE',
                    'arg' => 'DATE',
                    ),
                'release' => array(
                    'shortopt' => 'R',
                    'doc' => 'Diff against tag for package release REL',
                    'arg' => 'REL',
                    ),
                'revision' => array(
                    'shortopt' => 'r',
                    'doc' => 'Diff against revision REV',
                    'arg' => 'REV',
                    ),
                'context' => array(
                    'shortopt' => 'c',
                    'doc' => 'Generate context diff',
                    ),
                'unified' => array(
                    'shortopt' => 'u',
                    'doc' => 'Generate unified diff',
                    ),
                'ignore-case' => array(
                    'shortopt' => 'i',
                    'doc' => 'Ignore case, consider upper- and lower-case letters equivalent',
                    ),
                'ignore-whitespace' => array(
                    'shortopt' => 'b',
                    'doc' => 'Ignore changes in amount of white space',
                    ),
                'ignore-blank-lines' => array(
                    'shortopt' => 'B',
                    'doc' => 'Ignore changes that insert or delete blank lines',
                    ),
                'brief' => array(
                    'doc' => 'Report only whether the files differ, no details',
                    ),
                'dry-run' => array(
                    'shortopt' => 'n',
                    'doc' => 'Don\'t do anything, just pretend',
                    ),
                ),
            'doc' => '<package.xml>
Compares all the files in a package.  Without any options, this
command will compare the current code with the last checked-in code.
Using the -r or -R option you may compare the current code with that
of a specific release.
',
            ),
         'svntag' => array(
             'summary' => 'Set SVN Release Tag',
             'function' => 'doSvnTag',
             'shortcut' => 'sv',
             'options' => array(
                 'quiet' => array(
                     'shortopt' => 'q',
                     'doc' => 'Be quiet',
                     ),
                 'slide' => array(
                     'shortopt' => 'F',
                     'doc' => 'Move (slide) tag if it exists',
                     ),
                 'delete' => array(
                     'shortopt' => 'd',
                     'doc' => 'Remove tag',
                     ),
                 'dry-run' => array(
                     'shortopt' => 'n',
                     'doc' => 'Don\'t do anything, just pretend',
                     ),
                 ),
             'doc' => '<package.xml> [files...]
 Sets a SVN tag on all files in a package.  Use this command after you have
 packaged a distribution tarball with the "package" command to tag what
 revisions of what files were in that release.  If need to fix something
 after running svntag once, but before the tarball is released to the public,
 use the "slide" option to move the release tag.

 to include files (such as a second package.xml, or tests not included in the
 release), pass them as additional parameters.
 ',
             ),
        'cvstag' => array(
            'summary' => 'Set CVS Release Tag',
            'function' => 'doCvsTag',
            'shortcut' => 'ct',
            'options' => array(
                'quiet' => array(
                    'shortopt' => 'q',
                    'doc' => 'Be quiet',
                    ),
                'reallyquiet' => array(
                    'shortopt' => 'Q',
                    'doc' => 'Be really quiet',
                    ),
                'slide' => array(
                    'shortopt' => 'F',
                    'doc' => 'Move (slide) tag if it exists',
                    ),
                'delete' => array(
                    'shortopt' => 'd',
                    'doc' => 'Remove tag',
                    ),
                'dry-run' => array(
                    'shortopt' => 'n',
                    'doc' => 'Don\'t do anything, just pretend',
                    ),
                ),
            'doc' => '<package.xml> [files...]
Sets a CVS tag on all files in a package.  Use this command after you have
packaged a distribution tarball with the "package" command to tag what
revisions of what files were in that release.  If need to fix something
after running cvstag once, but before the tarball is released to the public,
use the "slide" option to move the release tag.

to include files (such as a second package.xml, or tests not included in the
release), pass them as additional parameters.
',
            ),
        'package-dependencies' => array(
            'summary' => 'Show package dependencies',
            'function' => 'doPackageDependencies',
            'shortcut' => 'pd',
            'options' => array(),
            'doc' => '<package-file> or <package.xml> or <install-package-name>
List all dependencies the package has.
Can take a tgz / tar file, package.xml or a package name of an installed package.'
            ),
        'sign' => array(
            'summary' => 'Sign a package distribution file',
            'function' => 'doSign',
            'shortcut' => 'si',
            'options' => array(
                'verbose' => array(
                    'shortopt' => 'v',
                    'doc' => 'Display GnuPG output',
                    ),
            ),
            'doc' => '<package-file>
Signs a package distribution (.tar or .tgz) file with GnuPG.',
            ),
        'makerpm' => array(
            'summary' => 'Builds an RPM spec file from a PEAR package',
            'function' => 'doMakeRPM',
            'shortcut' => 'rpm',
            'options' => array(
                'spec-template' => array(
                    'shortopt' => 't',
                    'arg' => 'FILE',
                    'doc' => 'Use FILE as RPM spec file template'
                    ),
                'rpm-pkgname' => array(
                    'shortopt' => 'p',
                    'arg' => 'FORMAT',
                    'doc' => 'Use FORMAT as format string for RPM package name, %s is replaced
by the PEAR package name, defaults to "PEAR::%s".',
                    ),
                ),
            'doc' => '<package-file>

Creates an RPM .spec file for wrapping a PEAR package inside an RPM
package.  Intended to be used from the SPECS directory, with the PEAR
package tarball in the SOURCES directory:

$ pear makerpm ../SOURCES/Net_Socket-1.0.tgz
Wrote RPM spec file PEAR::Net_Geo-1.0.spec
$ rpm -bb PEAR::Net_Socket-1.0.spec
...
Wrote: /usr/src/redhat/RPMS/i386/PEAR::Net_Socket-1.0-1.i386.rpm
',
            ),
        'convert' => array(
            'summary' => 'Convert a package.xml 1.0 to package.xml 2.0 format',
            'function' => 'doConvert',
            'shortcut' => 'c2',
            'options' => array(
                'flat' => array(
                    'shortopt' => 'f',
                    'doc' => 'do not beautify the filelist.',
                    ),
                ),
            'doc' => '[descfile] [descfile2]
Converts a package.xml in 1.0 format into a package.xml
in 2.0 format.  The new file will be named package2.xml by default,
and package.xml will be used as the old file by default.
This is not the most intelligent conversion, and should only be
used for automated conversion or learning the format.
'
            ),
        );

    var $o