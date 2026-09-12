import QtQuick.Layouts

Item {
    anchors.fill: parent

    Flickable {
        anchors.fill: parent
        contentHeight: form.implicitHeight + 48
        clip: true

        ColumnLayout {
            id: form
            width: parent.width
            anchors.margins: 24
            spacing: 10

            Text {
                Layout.fillWidth: true
                text: "Tapo L530 / P110 Standalone"
                color: "white"
                font.pixelSize: 24
                font.bold: true
            }

            RowLayout {
                Layout.fillWidth: true
                spacing: 16

                ColumnLayout {
                    Layout.fillWidth: true

                    Image {
                        Layout.alignment: Qt.AlignHCenter
                        Layout.preferredWidth: 140
                        Layout.preferredHeight: 140
                        fillMode: Image.PreserveAspectFit
                        source: discovery.l530ImageUrl
                    }

                    Text {
                        Layout.alignment: Qt.AlignHCenter
                        text: "Tapo L530"
                        color: "white"
                    }
                }

                ColumnLayout {
                    Layout.fillWidth: true

                    Image {
                        Layout.alignment: Qt.AlignHCenter
                        Layout.preferredWidth: 140
                        Layout.preferredHeight: 140
                        fillMode: Image.PreserveAspectFit
                        source: discovery.p110ImageUrl
                    }

                    Text {
                        Layout.alignment: Qt.AlignHCenter
                        text: "Tapo P110"
                        color: "white"
                    }
                }
            }

            Text {
                Layout.fillWidth: true
                text: "Account settings"
                color: "#9fd8ff"
                font.pixelSize: 18
                font.bold: true
            }

            TextField {
                id: accountEmail
                Layout.fillWidth: true
                placeholderText: "Tapo email address"
                text: discovery.email
            }

            TextField {
                id: accountPassword
                Layout.fillWidth: true
                placeholderText: discovery.hasPassword ? "Password saved — leave blank to keep it" : "Tapo password"
                echoMode: TextInput.Password
            }

            Text {
                Layout.fillWidth: true
                text: "L530 color bulb"
                color: "#9fd8ff"
                font.pixelSize: 18
                font.bold: true
            }

            CheckBox {
                id: l530Enabled
                text: "Enable Tapo L530"
                checked: discovery.l530Enabled
            }

            TextField {
                id: l530Name
                Layout.fillWidth: true
                placeholderText: "Device name shown in SignalRGB"
                text: discovery.l530Name
            }

            TextField {
                id: l530Ip
                Layout.fillWidth: true
                placeholderText: "L530 IPv4 address, for example 192.168.1.50"
                text: discovery.l530Ip
            }

            Text {
                Layout.fillWidth: true
                text: "P110 smart plug"
                color: "#9fd8ff"
                font.pixelSize: 18
                font.bold: true
            }

            CheckBox {
                id: p110Enabled
                text: "Enable Tapo P110"
                checked: discovery.p110Enabled
            }

            TextField {
                id: p110Name
                Layout.fillWidth: true
                placeholderText: "Device name shown in SignalRGB"
                text: discovery.p110Name
            }

            TextField {
                id: p110Ip
                Layout.fillWidth: true
                placeholderText: "P110 IPv4 address, for example 192.168.1.51"
                text: discovery.p110Ip
            }

            SButton {
                Layout.fillWidth: true
                Layout.preferredHeight: 44
                label.text: "SAVE — RESTART SIGNALRGB TO APPLY"
                onClicked: {
                    discovery.saveConfiguration(
                        accountEmail.text,
                        accountPassword.text,
                        l530Enabled.checked,
                        l530Name.text,
                        l530Ip.text,
                        p110Enabled.checked,
                        p110Name.text,
                        p110Ip.text
                    )
                    accountPassword.text = ""
                }
            }

            Text {
                Layout.fillWidth: true
                text: discovery.statusText
                color: "#ffcc80"
                font.pixelSize: 14
                wrapMode: Text.WordWrap
            }

            Text {
                Layout.fillWidth: true
                text: "For startup safety, Save does not rebuild devices while SignalRGB is running. Restart the app after saving. Test one enabled device first."
                color: "#d5dbe3"
                font.pixelSize: 14
                wrapMode: Text.WordWrap
            }
        }
    }
}
