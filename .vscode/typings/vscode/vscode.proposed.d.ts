de/a8uid/a8gid/a12size/a12mtime/" .
                   "a8checksum/a1typeflag/a100link/a6magic/a2version/" .
                   "a32uname/a32gname/a8devmajor/a8devminor/a131prefix";
        } else {
            $this->_fmt = "Z100filename/Z8mode/Z8uid/Z8gid/Z12size/Z12mtime/" .
                   "Z8checksum/Z1typeflag/Z100link/Z6magic/Z2version/" .
                   "Z32uname/Z32gname/Z8devmajor/Z8devminor/Z131prefix";
        }


    }

    public function __destruct()
    {
        $this->_close();
        // ----- Look for a local copy to delete
        if ($this->_temp_tarname != '') {
            @unlink($this->_temp_tarname);
        }
    }

    /**
     * This method creates the archive file and add the files / directories
     * that are listed in $p_filelist.
     * If a file with the same name exist and is writable, it is replaced
     * by the new tar.
     * The method return false and a PEAR error text.
     * The $p_filelist parameter can be an array of string, each string
     * representing a filename or a directory name with their path if
     * needed. It can also be a single string with names separated by a
     * single blank.
     * For each directory added in the archive, the files and
     * sub-directories are also added.
     * See also createModify() method for more details.
     *
     * @param array $p_filelist An array of filenames and directory names, or a
     *              single string with names separated by a single
     *              blank space.
     *
     * @return true on success, false on error.
     * @see    createModify()
     */
    public function create($p_filelist)
    {
        return $this->createModify($p_filelist, '', '');
    }

    /**
     * This method add the files / directories that are listed in $p_filelist in
     * the archive. If the archive does not exist it is created.
     * The method return false and a PEAR error text.
     * The files and directories listed are only added at the end of the archive,
     * even if a file with the same name is already archived.
     * See also createModify() method for more details.
     *
     * @param array $p_filelist An array of filenames and directory names, or a
     *              single string with names separated by a single
     *              blank space.
     *
     * @return true on success, false on error.
     * @see    createModify()
     * @access public
     */
    public function add($p_filelist)
    {
        return $this->addModify($p_filelist, '', '');
    }

    /**
     * @param string $p_path
     * @param bool $p_preserve
     * @return bool
     */
    public function extract($p_path = '', $p_preserve = false)
    {
        return $this->extractModify($p_path, '', $p_preserve);
    }

    /**
     * @return array|int
     */
    public function listContent()
    {
        $v_list_detail = array();

        if ($this->_openRead()) {
            if (!$this->_extractList('', $v_list_detail, "list", '', '')) {
                unset($v_list_detail);
                $v_list_detail = 0;
            }
            $this->_close();
        }

        return $v_list_detail;
    }

    /**
     * This method creates the archive file and add the files / directories
     * that are listed in $p_filelist.
     * If the file already exists and is writable, it is replaced by the
     * new tar. It is a create and not an add. If the file exists and is
     * read-only or is a directory it is not replaced. The method return
     * false and a PEAR error text.
     * The $p_filelist parameter can be an array of string, each string
     * representing a filename or a directory name with their path if
     * needed. It can also be a single string with names separated by a
     * single blank.
     * The path indicated in $p_remove_dir will be removed from the
     * memorized path of each file / directory listed when this path
     * exists. By default nothing is removed (empty path '')
     * The path indicated in $p_add_dir will be added at the beginning of
     * the memorized path of each file / directory listed. However it can
     * be set to empty ''. The adding of a path is done after the removing
     * of path.
     * The path add/remove ability enables the user to prepare an archive
     * for extraction in a different path than the origin files are.
     * See also addModify() method for file adding properties.
     *
     * @param array $p_filelist An array of filenames and directory names,
     *                             or a single string with names separated by
     *                             a single blank space.
     * @param string $p_add_dir A string which contains a path to be added
     *                             to the memorized path of each element in
     *                             the list.
     * @param string $p_remove_dir A string which contains a path to be
     *                             removed from the memorized path of each
     *                             element in the list, when relevant.
     *
     * @return boolean true on success, false on error.
     * @see addModify()
     */
    public function createModify($p_filelist, $p_add_dir, $p_remove_dir = '')
    {
        $v_result = true;

        if (!$this->_openWrite()) {
            return false;
        }

        if ($p_filelist != '') {
            if (is_array($p_filelist)) {
                $v_list = $p_filelist;
            } elseif (is_string($p_filelist)) {
                $v_list = explode($this->_separator, $p_filelist);
            } else {
                $this->_cleanFile();
                $this->_error('Invalid file list');
                return false;
            }

            $v_result = $this->_addList($v_list, $p_add_dir, $p_remove_dir);
        }

        if ($v_result) {
            $this->_writeFooter();
            $this->_close();
        } else {
            $this->_cleanFile();
        }

        return $v_result;
    }

    /**
     * This method add the files / directories listed in $p_filelist at the
     * end of the existing archive. If the archive does not yet exists it
     * is created.
     * The $p_filelist parameter can be an array of string, each string
     * representing a filename or a directory name with their path if
     * needed. It can also be a single string with names separated by a
     * single blank.
     * The path indicated in $p_remove_dir will be removed from the
     * memorized path of each file / directory listed when this path
     * exists. By default nothing is removed (empty path '')
     * The path indicated in $p_add_dir will be added at the beginning of
     * the memorized path of each file / directory listed. However it can
     * be set to empty ''. The adding of a path is done after the removing
     * of path.
     * The path add/remove ability enables the user to prepare an archive
     * for extraction in a different path than the origin files are.
     * If a file/dir is already in the archive it will only be added at the
     * end of the archive. There is no update of the existing archived
     * file/dir. However while extracting the archive, the last file will
     * replace the first one. This results in a none optimization of the
     * archive size.
     * If a file/dir does not exist the file/dir is ignored. However an
     * error text is send to PEAR error.
     * If a file/dir is not readable the file/dir is ignored. However an
     * error text is send to PEAR error.
     *
     * @param array $p_filelist An array of filenames and directory
     *                             names, or a single string with names
     *                             separated by a single blank space.
     * @param string $p_add_dir A string which contains a path to be
     *                             added to the memorized path of each
     *                             element in the list.
     * @param string $p_remove_dir A string which contains a path to be
     *                             removed from the memorized path of
     *                             each element in the list, when
     *                             relevant.
     *
     * @return true on success, false on error.
     */
    public function addModify($p_filelist, $p_add_dir, $p_remove_dir = '')
    {
        $v_result = true;

        if (!$this->_isArchive()) {
            $v_result = $this->createModify(
                $p_filelist,
                $p_add_dir,
                $p_remove_dir
            );
        } else {
            if (is_array($p_filelist)) {
                $v_list = $p_filelist;
            } elseif (is_string($p_filelist)) {
                $v_list = explode($this->_separator, $p_filelist);
            } else {
                $this->_error('Invalid file list');
                return false;
            }

            $v_result = $this->_append($v_list, $p_add_dir, $p_remove_dir);
        }

        return $v_result;
    }

    /**
     * This method add a single string as a file at the
     * end of the existing archive. If the archive does not yet exists it
     * is created.
     *
     * @param string $p_filename A string which contains the full
     *                           filename path that will be associated
     *                           with the string.
     * @param string $p_string The content of the file added in
     *                           the archive.
     * @param bool|int $p_datetime A custom date/time (unix timestamp)
     *                           for the file (optional).
     * @param array $p_params An array of optional params:
     *                               stamp => the datetime (replaces
     *                                   datetime above if it exists)
     *                               mode => the permissions on the
     *                                   file (600 by default)
     *                               type => is this a link?  See the
     *                                   tar specification for details.
     *                                   (default = regular file)
     *                               uid => the user ID of the file
     *                                   (default = 0 = root)
     *                               gid => the group ID of the file
     *                                   (default = 0 = root)
     *
     * @return true on success, false on error.
     */
    public function addString($p_filename, $p_string, $p_datetime = false, $p_params = array())
    {
        $p_stamp = @$p_params["stamp"] ? $p_params["stamp"] : ($p_datetime ? $p_datetime : time());
        $p_mode = @$p_params["mode"] ? $p_params["mode"] : 0600;
        $p_type = @$p_params["type"] ? $p_params["type"] : "";
        $p_uid = @$p_params["uid"] ? $p_params["uid"] : "";
        $p_gid = @$p_params["gid"] ? $p_params["gid"] : "";
        $v_result = true;

        if (!$this->_isArchive()) {
            if (!$this->_openWrite()) {
                return false;
            }
            $this->_close();
        }

        if (!$this->_openAppend()) {
            return false;
        }

        // Need to check the get back to the temporary file ? ....
        $v_result = $this->_addString($p_filename, $p_string, $p_datetime, $p_params);

        $this->_writeFooter();

        $this->_close();

        return $v_result;
    }

    /**
     * This method extract all the content of the archive in the directory
     * indicated by $p_path. When relevant the memorized path of the
     * files/dir can be modified by removing the $p_remove_path path at the
     * beginning of the file/dir path.
     * While extracting a file, if the directory path does not exists it is
     * created.
     * While extracting a file, if the file already exists it is replaced
     * without looking for last modification date.
     * While extracting a file, if the file already exists and is write
     * protected, the extraction is aborted.
     * While extracting a file, if a directory with the same name already
     * exists, the extraction is aborted.
     * While extracting a directory, if a file with the same name already
     * exists, the extraction is aborted.
     * While extracting a file/directory if the destination directory exist
     * and is write protected, or does not exist but can not be created,
     * the extraction is aborted.
     * If after extraction an extracted file does not show the correct
     * stored file size, the extraction is aborted.
     * When the extraction is aborted, a PEAR error text is set and false
     * is returned. However the result can be a partial extraction that may
     * need to be manually cleaned.
     *
     * @param string $p_path The path of the directory where the
     *                               files/dir need to by extracted.
     * @param string $p_remove_path Part of the memorized path that can be
     *                               removed if present at the beginning of
     *                               the file/dir path.
     * @param boolean $p_preserve Preserve user/group ownership of files
     *
     * @return boolean true on success, false on error.
     * @see    extractList()
     */
    public function extractModify($p_path, $p_remove_path, $p_preserve = false)
    {
        $v_result = true;
        $v_list_detail = array();

        if ($v_result = $this->_openRead()) {
            $v_result = $this->_extractList(
                $p_path,
                $v_list_detail,
                "complete",
                0,
                $p_remove_path,
                $p_preserve
            );
            $this->_close();
        }

        return $v_result;
    }

    /**
     * This method extract from the archive one file identified by $p_filename.
     * The return value is a string with the file content, or NULL on error.
     *
     * @param string $p_filename The path of the file to extract in a string.
     *
     * @return a string with the file content or NULL.
     */
    public function extractInString($p_filename)
    {
        if ($this->_openRead()) {
            $v_result = $this->_extractInString($p_filename);
            $this->_close();
        } else {
            $v_result = null;
        }

        return $v_result;
    }

    /**
     * This method extract from the archive only the files indicated in the
     * $p_filelist. These files are extracted in the current directory or
     * in the directory indicated by the optional $p_path parameter.
     * If indicated the $p_remove_path can be used in the same way as it is
     * used in extractModify() method.
     *
     * @param array $p_filelist An array of filenames and directory names,
     *                               or a single string with names separated
     *                               by a single blank space.
     * @param string $p_path The path of the directory where the
     *                               files/dir need to by extracted.
     * @param string $p_remove_path Part of the memorized path that can be
     *                               removed if present at the beginning of
     *                               the file/dir path.
     * @param boolean $p_preserve Preserve user/group ownership of files
     *
     * @return true on success, false on error.
     * @see    extractModify()
     */
    public function extractList($p_filelist, $p_path = '', $p_remove_path = '', $p_preserve = false)
    {
        $v_result = true;
        $v_list_detail = array();

        if (is_array($p_filelist)) {
            $v_list = $p_filelist;
        } elseif (is_string($p_filelist)) {
            $v_list = explode($this->_separator, $p_filelist);
        } else {
            $this->_error('Invalid string list');
            return false;
        }

        if ($v_result = $this->_openRead()) {
            $v_result = $this->_extractList(
                $p_path,
                $v_list_detail,
                "partial",
                $v_list,
                $p_remove_path,
                $p_preserve
            );
            $this->_close();
        }

        return $v_result;
    }

    /**
     * This method set specific attributes of the archive. It uses a variable
     * list of parameters, in the format attribute code + attribute values :
     * $arch->setAttribute(ARCHIVE_TAR_ATT_SEPARATOR, ',');
     *
     * @return true on success, false on error.
     */
    public function setAttribute()
    {
        $v_result = true;

        // ----- Get the number of variable list of arguments
        if (($v_size = func_num_args()) == 0) {
            return true;
        }

        // ----- Get the arguments
        $v_att_list = func_get_args();

        // ----- Read the attributes
        $i = 0;
        while ($i < $v_size) {

            // ----- Look for next option
            switch ($v_att_list[$i]) {
                // ----- Look for options that request a string value
                case ARCHIVE_TAR_ATT_SEPARATOR :
                    // ----- Check the number of parameters
                    if (($i + 1) >= $v_size) {
                        $this->_error(
                            'Invalid number of parameters for '
                            . 'attribute ARCHIVE_TAR_ATT_SEPARATOR'
                        );
                        return false;
                    }

                    // ----- Get the value
                    $this->_separator = $v_att_list[$i + 1];
                    $i++;
                    break;

                default :
                    $this->_error('Unknown attribute code ' . $v_att_list[$i] . '');
                    return false;
            }

            // ----- Next attribute
            $i++;
        }

        return $v_result;
    }

    /**
     * This method sets the regular expression for ignoring files and directories
     * at import, for example:
     * $arch->setIgnoreRegexp("#CVS|\.svn#");
     *
     * @param string $regexp regular expression defining which files or directories to ignore
     */
    public function setIgnoreRegexp($regexp)
    {
        $this->_ignore_regexp = $regexp;
    }

    /**
     * This method sets the regular expression for ignoring all files and directories
     * matching the filenames in the array list at import, for example:
     * $arch->setIgnoreList(array('CVS', '.svn', 'bin/tool'));
     *
     * @param array $list a list of file or directory names to ignore
     *
     * @access public
     */
    public function setIgnoreList($list)
    {
        $regexp = str_replace(array('#', '.', '^', '$'), array('\#', '\.', '\^', '\$'), $list);
        $regexp = '#/' . join('$|/', $list) . '#';
        $this->setIgnoreRegexp($regexp);
    }

    /**
     * @param string $p_message
     */
    public function _error($p_message)
    {
        $this->error_object = $this->raiseError($p_message);
    }

    /**
     * @param string $p_message
     */
    public function _warning($p_message)
    {
        $this->error_object = $this->raiseError($p_message);
    }

    /**
     * @param string $p_filename
     * @return bool
     */
    public function _isArchive($p_filename = null)
    {
        if ($p_filename == null) {
            $p_filename = $this->_tarname;
        }
        clearstatcache();
        return @is_file($p_filename) && !@is_link($p_filename);
    }

    /**
     * @return bool
     */
    public function _openWrite()
    {
        if ($this->_compress_type == 'gz' && function_exists('gzopen')) {
            $this->_file = @gzopen($this->_tarname, "wb9");
        } else {
            if ($this->_compress_type == 'bz2' && function_exists('bzopen')) {
                $this->_file = @bzopen($this->_tarname, "w");
            } else {
                if ($this->_compress_type == 'lzma2' && function_exists('xzopen')) {
                    $this->_file = @xzopen($this->_tarname, 'w');
                } else {
                    if ($this->_compress_type == 'none') {
                        $this->_file = @fopen($this->_tarname, "wb");
                    } else {
                        $this->_error(
                            'Unknown or missing compression type ('
                            . $this->_compress_type . ')'
                        );
                        return false;
                    }
                }
            }
        }

        if ($this->_file == 0) {
            $this->_error(
                'Unable to open in write mode \''
                . $this->_tarname . '\''
            );
            return false;
        }

        return true;
    }

    /**
     * @return bool
     */
    public function _openRead()
    {
        if (strtolower(substr($this->_tarname, 0, 7)) == 'http://') {

            // ----- Look if a local copy need to be done
            if ($this->_temp_tarname == '') {
                $this->_temp_tarname = uniqid('tar') . '.tmp';
                if (!$v_file_from = @fopen($this->_tarname, 'rb')) {
                    $this->_error(
                        'Unable to open in read mode \''
                        . $this->_tarname . '\''
                    );
                    $this->_temp_tarname = '';
                    return false;
                }
                if (!$v_file_to = @fopen($this->_temp_tarname, 'wb')) {
                    $this->_error(
                        'Unable to open in write mode \''
                        . $this->_temp_tarname . '\''
                    );
                    $this->_temp_tarname = '';
                    return false;
                }
                while ($v_data = @fread($v_file_from, 1024)) {
                    @fwrite($v_file_to, $v_data);
                }
                @fclose($v_file_from);
                @fclose($v_file_to);
            }

            // ----- File to open if the local copy
            $v_filename = $this->_temp_tarname;
        } else {
            // ----- File to open if the normal Tar file

            $v_filename = $this->_tarname;
        }

        if ($this->_compress_type == 'gz' && function_exists('gzopen')) {
            $this->_file = @gzopen($v_filename, "rb");
        } else {
            if ($this->_compress_type == 'bz2' && function_exists('bzopen')) {
                $this->_file = @bzopen($v_filename, "r");
            } else {
                if ($this->_compress_type == 'lzma2' && function_exists('xzopen')) {
                    $this->_file = @xzopen($v_filename, "r");
                } else {
                    if ($this->_compress_type == 'none') {
                        $this->_file = @fopen($v_filename, "rb");
                    } else {
                        $this->_error(
                            'Unknown or missing compression type ('
                            . $this->_compress_type . ')'
                        );
                        return false;
                    }
                }
            }
        }

        if ($this->_file == 0) {
            $this->_error('Unable to open in read mode \'' . $v_filename . '\'');
            return false;
        }

        return true;
    }

    /**
     * @return bool
     */
    public function _openReadWrite()
    {
        if ($this->_compress_type == 'gz') {
            $this->_file = @gzopen($this->_tarname, "r+b");
        } else {
            if ($this->_compress_type == 'bz2') {
                $this->_error(
                    'Unable to open bz2 in read/write mode \''
                    . $this->_tarname . '\' (limitation of bz2 extension)'
                );
                return false;
            } else {
                if ($this->_compress_type == 'lzma2') {
                    $this->_error(
                        'Unable to open lzma2 in read/write mode \''
                        . $this->_tarname . '\' (limitation of lzma2 extension)'
                    );
                    return false;
                } else {
                    if ($this->_compress_type == 'none') {
                        $this->_file = @fopen($this->_tarname, "r+b");
                    } else {
                        $this->_error(
                            'Unknown or missing compression type ('
                            . $this->_compress_type . ')'
                        );
                        return false;
                    }
                }
            }
        }

        if ($this->_file == 0) {
            $this->_error(
                'Unable to open in read/write mode \''
                . $this->_tarname . '\''
            );
            return false;
        }

        return true;
    }

    /**
     * @return bool
     */
    public function _close()
    {
        //if (isset($this->_file)) {
        if (is_resource($this->_file)) {
            if ($this->_compress_type == 'gz') {
                @gzclose($this->_file);
            } else {
                if ($this->_compress_type == 'bz2') {
                    @bzclose($this->_file);
                } else {
                    if ($this->_compress_type == 'lzma2') {
                        @xzclose($this->_file);
                    } else {
                        if ($this->_compress_type == 'none') {
                            @fclose($this->_file);
                        } else {
                            $this->_error(
                                'Unknown or missing compression type ('
                                . $this->_compress_type . ')'
                            );
                        }
                    }
                }
            }

            $this->_file = 0;
        }

        // ----- Look if a local copy need to be erase
        // Note that it might be interesting to keep the url for a time : ToDo
        if ($this->_temp_tarname != '') {
            @unlink($this->_temp_tarname);
            $this->_temp_tarname = '';
        }

        return true;
    }

    /**
     * @return bool
     */
    public function _cleanFile()
    {
        $this->_close();

        // ----- Look for a local copy
        if ($this->_temp_tarname != '') {
            // ----- Remove the local copy but not the remote tarname
            @unlink($this->_temp_tarname);
            $this->_temp_tarname = '';
        } else {
            // ----- Remove the local tarname file
            @unlink($this->_tarname);
        }
        $this->_tarname = '';

        return true;
    }

    /**
     * @param mixed $p_binary_data
     * @param integer $p_len
     * @return bool
     */
    public function _writeBlock($p_binary_data, $p_len = null)
    {
        if (is_resource($this->_file)) {
            if ($p_len === null) {
                if ($this->_compress_type == 'gz') {
                    @gzputs($this->_file, $p_binary_data);
                } else {
                    if ($this->_compress_type == 'bz2') {
                        @bzwrite($this->_file, $p_binary_data);
                    } else {
                        if ($this->_compress_type == 'lzma2') {
                            @xzwrite($this->_file, $p_binary_data);
                        } else {
                            if ($this->_compress_type == 'none') {
                                @fputs($this->_file, $p_binary_data);
                            } else {
                                $this->_error(
                                    'Unknown or missing compression type ('
                                    . $this->_compress_type . ')'
                                );
                            }
                        }
                    }
                }
            } else {
                if ($this->_compress_type == 'gz') {
                    @gzputs($this->_file, $p_binary_data, $p_len);
                } else {
                    if ($this->_compress_type == 'bz2') {
                        @bzwrite($this->_file, $p_binary_data, $p_len);
                    } else {
                        if ($this->_compress_type == 'lzma2') {
                            @xzwrite($this->_file, $p_binary_data, $p_len);
                        } else {
                            if ($this->_compress_type == 'none') {
                                @fputs($this->_file, $p_binary_data, $p_len);
                            } else {
                                $this->_error(
                                    'Unknown or missing compression type ('
                                    . $this->_compress_type . ')'
                                );
                            }
                        }
   <?php
/* vim: set expandtab tabstop=4 shiftwidth=4: */
/**
 * PHP Version 5
 *
 * Copyright (c) 1997-2004 The PHP Group
 *
 * This source file is subject to version 3.0 of the PHP license,
 * that is bundled with this package in the file LICENSE, and is
 * available through the world-wide-web at the following url:
 * http://www.php.net/license/3_0.txt.
 * If you did not receive a copy of the PHP license and are unable to
 * obtain it through the world-wide-web, please send a note to
 * license@php.net so we can mail you a copy immediately.
 *
 * @category Console
 * @package  Console_Getopt
 * @author   Andrei Zmievski <andrei@php.net>
 * @license  http://www.php.net/license/3_0.txt PHP 3.0
 * @version  CVS: $Id$
 * @link     http://pear.php.net/package/Console_Getopt
 */

require_once 'PEAR.php';

/**
 * Command-line options parsing class.
 *
 * @category Console
 * @package  Console_Getopt
 * @author   Andrei Zmievski <andrei@php.net>
 * @license  http://www.php.net/license/3_0.txt PHP 3.0
 * @link     http://pear.php.net/package/Console_Getopt
 */
class Console_Getopt
{

    /**
     * Parses the command-line options.
     *
     * The first parameter to this function should be the list of command-line
     * arguments without the leading reference to the running program.
     *
     * The second parameter is a string of allowed short options. Each of the
     * option letters can be followed by a colon ':' to specify that the option
     * requires an argument, or a double colon '::' to specify that the option
     * takes an optional argument.
     *
     * The third argument is an optional array of allowed long options. The
     * leading '--' should not be included in the option name. Options that
     * require an argument should be followed by '=', and options that take an
     * option argument should be followed by '=='.
     *
     * The return value is an array of two elements: the list of parsed
     * options and the list of non-option command-line arguments. Each entry in
     * the list of parsed options is a pair of elements - the first one
     * specifies the option, and the second one specifies the option argument,
     * if there was one.
     *
     * Long and short options can be mixed.
     *
     * Most of the semantics of this function are based on GNU getopt_long().
     *
     * @param array  $args          an array of command-line arguments
     * @param string $short_options specifies the list of allowed short options
     * @param array  $long_options  specifies the list of allowed long options
     * @param boolean $skip_unknown suppresses Console_Getopt: unrecognized option
     *
     * @return array two-element array containing the list of parsed options and
     * the non-option arguments
     */
    public static function getopt2($args, $short_options, $long_options = null, $skip_unknown = false)
    {
        return Console_Getopt::doGetopt(2, $args, $short_options, $long_options, $skip_unknown);
    }

    /**
     * This function expects $args to start with the script name (POSIX-style).
     * Preserved for backwards compatibility.
     *
     * @param array  $args          an array of command-line arguments
     * @param string $short_options specifies the list of allowed short options
     * @param array  $long_options  specifies the list of allowed long options
     *
     * @see getopt2()
     * @return array two-element array containing the list of parsed options and
     * the non-option arguments
     */
    public static function getopt($args, $short_options, $long_options = null, $skip_unknown = false)
    {
        return Console_Getopt::doGetopt(1, $args, $short_options, $long_options, $skip_unknown);
    }

    /**
     * The actual implementation of the argument parsing code.
     *
     * @param int    $version       Version to use
     * @param array  $args          an array of command-line arguments
     * @param string $short_options specifies the list of allowed short options
     * @param array  $long_options  specifies the list of allowed long options
     * @$mode, $options = null)
    {
        $stack       = &$GLOBALS['_PEAR_error_handler_stack'];
        $def_mode    = &$GLOBALS['_PEAR_default_error_mode'];
        $def_options = &$GLOBALS['_PEAR_default_error_options'];
        $stack[] = array($def_mode, $def_options);
        switch ($mode) {
            case PEAR_ERROR_EXCEPTION:
            case PEAR_ERROR_RETURN:
            case PEAR_ERROR_PRINT:
            case PEAR_ERROR_TRIGGER:
            case PEAR_ERROR_DIE:
            case null:
                $def_mode = $mode;
                $def_options = $options;
                break;

            case PEAR_ERROR_CALLBACK:
                $def_mode = $mode;
                // class/object method callback
                if (is_callable($options)) {
                    $def_options = $options;
                } else {
                    trigger_error("invalid error callback", E_USER_WARNING);
                }
                break;

            default:
                trigger_error("invalid error mode", E_USER_WARNING);
                break;
        }
        $sta