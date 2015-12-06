/*jslint todo: true */
var serial = {};
serial.host = 
    {
    name: 'host01',
    devices: [],
    serialport: require('serialport'),
    net: require('net'),
    servername: 'domotica.muysers.nl',
    serverport: 9999,
    server: undefined,
    init: function() {
        serial.host.connectServer();
        serial.host.checkPorts();
    },
    connectServer: function() {
        serial.host.server = new serial.host.net.Socket();
        serial.host.server.connect(this.serverport, this.servername, function(){
            console.log("Connected to: " + serial.host.servername + ":" + serial.host.serverport);
            if (serial.host.devices.length > 0) {
                var i;
                for (i = 0; i < serial.host.devices.length; i++) {
                    console.log("initialize " + serial.host.devices[i].name);
                    serial.host.server.write("init " + serial.host.devices[i].name + "\n");
                }
            }
        });
        serial.host.server.on('data', serial.host.serverData);
        serial.host.server.on('error', serial.host.serverError);
        if (serial.host.checkinterval !== undefined) {
            clearInterval(serial.host.checkinterval);
        }
        serial.host.checkinterval = setInterval(function(){
            if (serial.host.server.writable === false) {
                serial.host.connectServer();
            }
        }, 2000);
    },
    serverData: function(data) {
        data += "";
        var message, deviceID;
            message = data.split(' ');
            deviceID = serial.host.findDeviceIDByName(message[1]);
            if (deviceID > -1) {
                console.log("command to device: " +data);
                if (data.substr(data.length - 1) !== "\n") {
                    data += "\n";
                }
                serial.host.devices[deviceID].port.write(data);
            } else {
                console.log("Device not found: " + message[1]);
            }
    },
    serverError: function(error) {
        console.log("ERROR: " + error);
    },
    checkPorts: function() {
        serial.host.serialport.list(function (err, ports) {
            if (err) {
                console.log("ERROR: "+err);
            }
            var i, j, found;
            ports.forEach(function(port) {
                //console.log("check port: " + port.comName);
                if (serial.host.findDeviceIDByComName(port.comName) === -1){
                    //console.log("new port");
                    var testport = new serial.host.serialport
                    .SerialPort(port.comName, { parser: serial.host.serialport.parsers.readline("\n") });
                    testport.on('data', function(data){
                        if (data.substring(0,4)==='init'){
                            console.log('device found at: '+port.comName);
                            serial.host.devices[serial.host.devices.length] = new serial.host.Device(port.comName);
                            console.log(serial.host.devices);
                            testport.close();
                            //TODO: this should time out
                        }
                    });
                }
            });
            for (i = 0; i < serial.host.devices.length; i++) {
                found = false;
                for (j = 0; j < ports.length; j++) {
                    if (ports[j].comName === serial.host.devices[i].comName) {
                        found = true;
                        break;
                    }
                }
                if (found === false) {
                    console.log("device at: " + serial.host.devices[i].comName + " removed");
                    serial.host.server.write("remove " + serial.host.devices[i].name + "\n");
                    serial.host.devices[i].port.close();
                    serial.host.devices.splice(i,1);
                }
            }
        });
        setTimeout(serial.host.checkPorts, 5000);
    },
    findDeviceIDByName: function(name) {
        var i;
        for (i = 0; i < serial.host.devices.length; i++) {
            if (serial.host.devices[i].name === name) {
                return i;
            }
        }
        return -1;
    },
    findDeviceIDByComName: function(comName) {
        var i;
        for (i = 0; i < serial.host.devices.length; i++) {
            if (serial.host.devices[i].comName === comName) {
                return i;
            }
        }
        return -1;
    },
    Device: function(comName) {
        var that = this;
        this.comName = comName;
        this.port = new serial.host.serialport
        .SerialPort(comName, { parser: serial.host.serialport.parsers.readline("\n") });
        function serialData(data) {
            console.log("device:" + data);
            var message = data.split(' ');
            switch (message[0]) {
                case 'init':
                    that.name = message[1].replace("\r","");
                serial.host.server.write("init " + that.name + "\n");
                break;
                case 'returnstatus':
                    serial.host.server.write("returnstatus " + message[1] + " " + message[2] + "\n");
                break;
                case 'event':
                    serial.host.server.write(message[0]+" "+that.name+" "+message[1]+" "+message[2]+"\n");
                break;
                case 'irevent':
                    serial.host.server.write(message[0]+" "+that.name+" "+message[1]+" "+message[2]+"\n");
                break;
                default:
                    console.log("command not found: " + data);
                break;
            }
        }
        this.port.on('data', serialData);
    }
};
serial.host.init();
