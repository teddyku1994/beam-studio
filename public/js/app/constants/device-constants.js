define(function() {
    'use strict';

    return {
        // Status
        STARTING        : 'STARTING',
        RUNNING         : 'RUNNING',
        READY           : 'READY',
        PAUSING         : 'PAUSING',
        PAUSED          : 'PAUSED',
        CONNECTED       : 'CONNECTED',
        DISCONNECTED    : 'DISCONNECTED',
        BUSY            : 'BUSY',
        ERROR           : 'ERROR',
        ABORTED         : 'ABORTED',
        UNKNOWN         : 'UNKNOWN',
        COMPLETED       : 'COMPLETED',
        COMPLETING      : 'COMPLETING',
        FATAL           : 'FATAL',
        OK              : 'OK',
        IDLE            : 'IDLE',
        RESUMING        : 'RESUMING',
        AUTH_ERROR      : 'AUTH_ERROR',
        HEAD_OFFLINE    : 'HEAD_OFFLINE',
        HEAD_ERROR      : 'HEAD_ERROR',
        WRONG_HEAD      : 'WRONG_HEAD',
        AUTH_FAILED     : 'AUTH_FAILED',
        HEADER_OFFLINE  : 'HEADER_OFFLINE',
        HEADER_ERROR    : 'HEADER_ERROR',
        WRONG_HEADER    : 'WRONG_HEADER',
        TILT            : 'TILT',
        FAN_FAILURE     : 'FAN_FAILURE',
        TIMEOUT         : 'TIMEOUT',
        FILAMENT_RUNOUT : 'FILAMENT_RUNOUT',
        UNKNOWN_ERROR   : 'UNKNOWN_ERROR',
        UNKNOWN_STATUS  : 'UNKNOWN_STATUS',
        USER_OPERATION  : 'USER_OPERATION',
        UPLOADING       : 'UPLOADING',
        WAITING_HEAD    : 'WAITING_HEAD',
        CORRECTING      : 'CORRECTING',
        OCCUPIED        : 'OCCUPIED',
        SCANNING        : 'SCANNING',
        CALIBRATING     : 'CALIBRATING',
        HEATING         : 'HEATING',
        MONITOR_TOO_OLD : 'FLUXMONITOR_VERSION_IS_TOO_OLD',
        RESOURCE_BUSY   : 'RESOURCE_BUSY',

        // folder
        NOT_EXIST       : 'NOT_EXIST',
        PREVIEW         : 'PREVIEW',
        DOWNLOAD        : 'DOWNLOAD',
        UPLOAD          : 'UPLOAD',
        SELECT          : 'SELECT',

        // Print head
        EXTRUDER        : 'EXTRUDER',
        PRINTER         : 'PRINTER',
        LASER           : 'LASER',

        // Command
        RESUME          : 'RESUME',
        PAUSE           : 'PAUSE',
        STOP            : 'STOP',
        REPORT          : 'REPORT',
        ABORT           : 'ABORT',
        QUIT            : 'QUIT',
        QUIT_TASK       : 'QUIT_TASK',
        KICK            : 'KICK',
        LS              : 'LS',
        LOAD_FILAMENT   : 'LOAD',
        LOAD_FLEXIBLE_FILAMENT   : 'LOADF',
        UNLOAD_FILAMENT : 'UNLOAD',
        MOVEMENT_TEST   : "data:;base64,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",

        status : {
            RAW                     : -10,
            SCAN                    : -2,
            MAINTAIN                : -1,
            IDLE                    : 0,
            INIT                    : 1,
            STARTING                : 4,
            RESUME_TO_STARTING      : 6,
            RUNNING                 : 16,
            RESUME_TO_RUNNING       : 18,
            PAUSED                  : 32,
            PAUSED_FROM_STARTING    : 36,
            PAUSING_FROM_STARTING   : 38,
            PAUSED_FROM_RUNNING     : 48,
            PAUSING_FROM_RUNNING    : 50,
            COMPLETED               : 64,
            COMPLETING              : 66,
            ABORTED                 : 128
        }
    };
});
