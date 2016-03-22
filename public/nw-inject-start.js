// avoid name conflict
window.requireNode = nw.require || function() {};

var process = nw.process,
    fs = requireNode('fs'),
    os = requireNode('os'),
    path = requireNode('path'),
    nwPath = process.execPath,
    nwDir = path.dirname(nwPath),
    dirParts = nwDir.split(path.sep),
    osType = os.type(),
    spawn = requireNode('child_process').spawn,
    exec = requireNode('child_process').exec,
    cwd = process.cwd(),
    net = requireNode('net'),
    currentPort = 10000,
    maxPort = 65535,
    ghost,
    ghostExecuted = false,
    appWindow,
    executeGhost = function(port, libPath) {
        var slic3rPathIndex = 1,
            args = [
                '--slic3r',
                '',
                '--port',
                port
            ],
            ghostCmd = '',
            writeLog = function(message, mode) {
                var callback = function(err) {
                    if (err) {
                        console.log('cant save log');
                    }
                };

                if ('w' === mode) {
                    fs.writeFile('message.log', message, 'utf8', callback);
                }
                else {
                    fs.appendFile('message.log', message, 'utf8', callback);
                }
            },
            recordOutput = function(data) {
                console.log(data.toString());
                writeLog(data.toString());
            };

        // empty message.log
        writeLog('', 'w');

        if ('Windows_NT' === osType) {
            // TODO: has to assign env root for slic3r
            args[slic3rPathIndex] = libPath + '/lib/Slic3r/slic3r-console.exe';
            ghostCmd = libPath + '/lib/flux_api/flux_api.exe' ;
        }
        else if ('Linux' === osType) {
            args[slic3rPathIndex] = libPath + '/lib/Slic3r/bin/slic3r';
            ghostCmd = libPath + '/lib/flux_api/flux_api';
        }
        else {
            args[slic3rPathIndex] = libPath + '/lib/slic3r';
            ghostCmd = libPath + '/lib/flux_api/flux_api';
        }

        try {
            fs.chmodSync(ghostCmd, 0777);
            fs.chmodSync(args[slic3rPathIndex], 0777);
        }
        catch (ex) {
            console.log(ex);
            writeLog(ex.message);
        }

        if (false === ghostExecuted) {
            ghost = spawn(ghostCmd, args);
            ghost.stdout.on('data', recordOutput);
            ghost.stderr.on('data', recordOutput);

            ghostExecuted = true;
        }

        ghost.on('error', function(err) {
            if (err) {
                writeLog(err.message);
            }
        });

        ghost.on('exit', function (code) {
            console.log('child process exited with code ' + code);
            writeLog('FLUX API is closed (' + code + ')');
        });

        process.env.ghostPort = port;
    },
    probe = function(port, callback) {
        var socket = new net.Socket(),
            portAvailable = true;

        socket.connect(port, '127.0.0.1', function() {
            portAvailable = false;

            socket.end(function() {
                callback(portAvailable);
            });
        });

        socket.on('error', function() {
            callback(portAvailable);
        });
    },
    findPort = function(result) {
        if (true === result) {
            var seperate_package_path,
                contentPos,
                appRoot;

            switch (osType) {
            case 'Windows_NT':
                appRoot = dirParts.join(path.sep);
                seperate_package_path = appRoot + '/lib/flux_api/flux_api.exe';
                break;
            case 'Linux':
                break;
            case 'Darwin':
                contentPos = dirParts.indexOf('Contents');
                contentPos = (-1 < contentPos ? contentPos : dirParts.length);
                appRoot = dirParts.slice(0, contentPos + 1).join(path.sep);
                seperate_package_path = appRoot + '/lib/flux_api/flux_api';
                break;
            }

            fs.stat(seperate_package_path, function(err, stat) {
                if (null === err) {
                    executeGhost(currentPort, appRoot);
                }
                else {
                    executeGhost(currentPort, cwd);
                }
            });
        }
        else if (currentPort < maxPort) {
            currentPort++;
            probe(currentPort, findPort);
        }
        else {
            // stop trying and response error
        }
    };

switch (osType) {
case 'Windows_NT':
    process.env.osType = 'win';
    break;
case 'Linux':
    process.env.osType = 'linux';
    break;
case 'Darwin':
    process.env.osType = 'osx';
    break;
}

switch (os.arch()) {
case 'x64':
    process.env.arch = 'x64';
    break;
case 'ia32':
default:
    process.env.arch = 'x86';
    break;
}

// find port
probe(currentPort, findPort);

delete window.require;