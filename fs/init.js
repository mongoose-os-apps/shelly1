load('api_config.js');
load('api_events.js');
load('api_gpio.js');
load('api_mqtt.js');
load('api_net.js');
load('api_sys.js');
load('api_timer.js');

let relay_pin = Cfg.get('pins.relay');
let sw_pin = Cfg.get('pins.sw');
let pub_topic = 'shelly1/' + Cfg.get('device.id') + '/state';
let sub_topic = 'shelly1/' + Cfg.get('device.id') + '/commands';

print('Relay GPIO:', relay_pin, ' SW GPIO:', sw_pin);

function publishState() {
  MQTT.pub(pub_topic, GPIO.read(relay_pin) ? 'on' : 'off', 1);
}

// Keep relay OFF by default
GPIO.set_mode(relay_pin, GPIO.MODE_OUTPUT);
GPIO.write(relay_pin, 0);

// Configure SW pin
GPIO.set_mode(sw_pin, GPIO.MODE_INPUT);
GPIO.set_pull(sw_pin, GPIO.PULL_NONE);

// Each button press toggles the relay and sends an update
GPIO.set_button_handler(sw_pin, GPIO.PULL_NONE, GPIO.INT_EDGE_POS, 100, function() {
  GPIO.toggle(relay_pin);
  publishState();
}, null);

// Subscribe for commands over MQTT
MQTT.sub(sub_topic, function(conn, topic, msg) {
  if (msg === 'on') {
    GPIO.write(relay_pin, 1);
  } else if (msg === 'off') {
    GPIO.write(relay_pin, 0);
  } else if (msg === 'toggle') {
    GPIO.toggle(relay_pin);
  } else {
    print("unrecognized command");
    return;
  }
  publishState();
}, null);

// Publish our status 
MQTT.setEventHandler(function(conn, ev, edata) {
  if (ev === MQTT.EV_CONNACK) {
    publishState();
  }
});

// Monitor network connectivity.
Event.addGroupHandler(Net.EVENT_GRP, function(ev, evdata, arg) {
  let evs = '???';
  if (ev === Net.STATUS_DISCONNECTED) {
    evs = 'DISCONNECTED';
  } else if (ev === Net.STATUS_CONNECTING) {
    evs = 'CONNECTING';
  } else if (ev === Net.STATUS_CONNECTED) {
    evs = 'CONNECTED';
  } else if (ev === Net.STATUS_GOT_IP) {
    evs = 'GOT_IP';
  }
  print('== Net event:', ev, evs);
}, null);
