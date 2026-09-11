Item {
    anchors.fill: parent

    property int panelWidth: 560
    property color accent: "#29b6a8"
    property color purple: "#8b6fc0"
    property color card: "#1e1e1e"
    property color field: "#252525"

    Flickable {
        anchors.fill: parent
        contentWidth: panelWidth
        contentHeight: contentColumn.height + 24
        clip: true

        Column {
            id: contentColumn
            width: panelWidth
            spacing: 10

            Text {
                text: "Tapo Standalone"
                color: theme.primarytextcolor
                font.family: "Poppins"
                font.bold: true
                font.pixelSize: 22
            }

            Text {
                width: panelWidth
                wrapMode: Text.WordWrap
                text: "Direct LAN • KLAP v2 • No tapo-rest. Configure account, device names and IPs here."
                color: "#8a8a8a"
                font.family: "Poppins"
                font.pixelSize: 11
            }

            Rectangle {
                width: panelWidth
                height: 150
                radius: 6
                color: card
                border.color: "#303030"

                Rectangle { width: 4; height: parent.height; color: accent; radius: 2 }

                Column {
                    x: 18
                    y: 14
                    width: parent.width - 36
                    spacing: 10

                    Text {
                        text: "TAPO ACCOUNT"
                        color: accent
                        font.family: "Poppins"
                        font.bold: true
                        font.pixelSize: 12
                        font.letterSpacing: 1
                    }

                    Row {
                        spacing: 8
                        Text {
                            text: "EMAIL"
                            width: 95
                            height: 30
                            verticalAlignment: Text.AlignVCenter
                            color: "#777"
                            font.family: "Poppins"
                            font.pixelSize: 10
                        }

                        Rectangle {
                            width: 380
                            height: 30
                            radius: 4
                            color: field
                            border.color: emailField.activeFocus ? accent : "#3a3a3a"

                            TextField {
                                id: emailField
                                anchors.fill: parent
                                leftPadding: 10
                                rightPadding: 10
                                text: discovery.email || ""
                                color: theme.primarytextcolor
                                font.family: "Poppins"
                                font.pixelSize: 12
                                background: Item {}
                                placeholderText: "name@example.com"
                            }
                        }
                    }

                    Row {
                        spacing: 8

                        Text {
                            text: "PASSWORD"
                            width: 95
                            height: 30
                            verticalAlignment: Text.AlignVCenter
                            color: "#777"
                            font.family: "Poppins"
                            font.pixelSize: 10
                        }

                        Rectangle {
                            width: 380
                            height: 30
                            radius: 4
                            color: field
                            border.color: passwordField.activeFocus ? accent : "#3a3a3a"

                            TextField {
                                id: passwordField
                                anchors.fill: parent
                                leftPadding: 10
                                rightPadding: 10
                                text: discovery.password || ""
                                echoMode: TextInput.Password
                                color: theme.primarytextcolor
                                font.family: "Poppins"
                                font.pixelSize: 12
                                background: Item {}
                                placeholderText: "Tapo account password"
                            }
                        }
                    }
                }
            }

            Rectangle {
                width: panelWidth
                height: 176
                radius: 6
                color: card
                border.color: "#303030"

                Rectangle { width: 4; height: parent.height; color: "#00b4d8"; radius: 2 }

                Column {
                    x: 18
                    y: 14
                    width: parent.width - 36
                    spacing: 9

                    Row {
                        spacing: 10
                        CheckBox { id: l530Enabled; checked: discovery.l530Enabled }

                        Text {
                            text: "Tapo L530"
                            color: theme.primarytextcolor
                            font.family: "Poppins"
                            font.bold: true
                            font.pixelSize: 14
                            anchors.verticalCenter: parent.verticalCenter
                        }

                        Text {
                            text: "RGB BULB"
                            color: "#00b4d8"
                            font.family: "Poppins"
                            font.pixelSize: 9
                            anchors.verticalCenter: parent.verticalCenter
                        }
                    }

                    Row {
                        spacing: 8
                        Text { text: "DEVICE NAME"; width: 95; height: 30; verticalAlignment: Text.AlignVCenter; color: "#777"; font.family: "Poppins"; font.pixelSize: 10 }

                        Rectangle {
                            width: 380
                            height: 30
                            radius: 4
                            color: field

                            TextField {
                                id: l530Name
                                anchors.fill: parent
                                leftPadding: 10
                                rightPadding: 10
                                text: discovery.l530Name || "Tapo L530"
                                color: theme.primarytextcolor
                                font.family: "Poppins"
                                font.pixelSize: 12
                                background: Item {}
                                placeholderText: "Salon Ampul"
                            }
                        }
                    }

                    Row {
                        spacing: 8
                        Text { text: "IP ADDRESS"; width: 95; height: 30; verticalAlignment: Text.AlignVCenter; color: "#777"; font.family: "Poppins"; font.pixelSize: 10 }

                        Rectangle {
                            width: 220
                            height: 30
                            radius: 4
                            color: field

                            TextField {
                                id: l530Ip
                                anchors.fill: parent
                                leftPadding: 10
                                rightPadding: 10
                                text: discovery.l530Ip || ""
                                color: theme.primarytextcolor
                                font.family: "Poppins"
                                font.pixelSize: 12
                                background: Item {}
                                placeholderText: "192.168.1.50"
                            }
                        }
                    }

                    Text {
                        text: "This name is used as the visible SignalRGB device name."
                        color: "#666"
                        font.family: "Poppins"
                        font.pixelSize: 10
                    }
                }
            }

            Rectangle {
                width: panelWidth
                height: 176
                radius: 6
                color: card
                border.color: "#303030"

                Rectangle { width: 4; height: parent.height; color: "#f0a54a"; radius: 2 }

                Column {
                    x: 18
                    y: 14
                    width: parent.width - 36
                    spacing: 9

                    Row {
                        spacing: 10
                        CheckBox { id: p110Enabled; checked: discovery.p110Enabled }

                        Text {
                            text: "Tapo P110"
                            color: theme.primarytextcolor
                            font.family: "Poppins"
                            font.bold: true
                            font.pixelSize: 14
                            anchors.verticalCenter: parent.verticalCenter
                        }

                        Text {
                            text: "SMART PLUG"
                            color: "#f0a54a"
                            font.family: "Poppins"
                            font.pixelSize: 9
                            anchors.verticalCenter: parent.verticalCenter
                        }
                    }

                    Row {
                        spacing: 8
                        Text { text: "DEVICE NAME"; width: 95; height: 30; verticalAlignment: Text.AlignVCenter; color: "#777"; font.family: "Poppins"; font.pixelSize: 10 }

                        Rectangle {
                            width: 380
                            height: 30
                            radius: 4
                            color: field

                            TextField {
                                id: p110Name
                                anchors.fill: parent
                                leftPadding: 10
                                rightPadding: 10
                                text: discovery.p110Name || "Tapo P110"
                                color: theme.primarytextcolor
                                font.family: "Poppins"
                                font.pixelSize: 12
                                background: Item {}
                                placeholderText: "Masa Prizi"
                            }
                        }
                    }

                    Row {
                        spacing: 8
                        Text { text: "IP ADDRESS"; width: 95; height: 30; verticalAlignment: Text.AlignVCenter; color: "#777"; font.family: "Poppins"; font.pixelSize: 10 }

                        Rectangle {
                            width: 220
                            height: 30
                            radius: 4
                            color: field

                            TextField {
                                id: p110Ip
                                anchors.fill: parent
                                leftPadding: 10
                                rightPadding: 10
                                text: discovery.p110Ip || ""
                                color: theme.primarytextcolor
                                font.family: "Poppins"
                                font.pixelSize: 12
                                background: Item {}
                                placeholderText: "192.168.1.51"
                            }
                        }
                    }

                    Text {
                        text: "P110 exposes power control; it has no RGB LEDs."
                        color: "#666"
                        font.family: "Poppins"
                        font.pixelSize: 10
                    }
                }
            }

            Rectangle {
                width: panelWidth
                height: 190
                radius: 6
                color: card
                border.color: "#303030"

                Rectangle { width: 4; height: parent.height; color: purple; radius: 2 }

                Column {
                    x: 18
                    y: 14
                    width: parent.width - 36
                    spacing: 9

                    Text {
                        text: "ADVANCED / DIAGNOSTICS"
                        color: purple
                        font.family: "Poppins"
                        font.bold: true
                        font.pixelSize: 12
                        font.letterSpacing: 1
                    }

                    Row {
                        spacing: 18

                        Column {
                            spacing: 3
                            Text { text: "FRAME SKIP"; color: "#777"; font.family: "Poppins"; font.pixelSize: 9 }
                            Rectangle {
                                width: 92
                                height: 30
                                radius: 4
                                color: field

                                TextField {
                                    id: frameSkip
                                    anchors.fill: parent
                                    leftPadding: 10
                                    text: String(discovery.frameSkip || 6)
                                    color: theme.primarytextcolor
                                    background: Item {}
                                    validator: IntValidator { bottom: 1; top: 60 }
                                }
                            }
                        }

                        Column {
                            spacing: 3
                            Text { text: "MIN DELTA"; color: "#777"; font.family: "Poppins"; font.pixelSize: 9 }
                            Rectangle {
                                width: 92
                                height: 30
                                radius: 4
                                color: field

                                TextField {
                                    id: minDelta
                                    anchors.fill: parent
                                    leftPadding: 10
                                    text: String(discovery.minDelta !== undefined ? discovery.minDelta : 2)
                                    color: theme.primarytextcolor
                                    background: Item {}
                                    validator: IntValidator { bottom: 0; top: 100 }
                                }
                            }
                        }

                        Column {
                            spacing: 3
                            Text { text: "RECONNECT MS"; color: "#777"; font.family: "Poppins"; font.pixelSize: 9 }

                            Rectangle {
                                width: 120
                                height: 30
                                radius: 4
                                color: field

                                TextField {
                                    id: reconnectMs
                                    anchors.fill: parent
                                    leftPadding: 10
                                    text: String(discovery.reconnectMs || 3000)
                                    color: theme.primarytextcolor
                                    background: Item {}
                                    validator: IntValidator { bottom: 500; top: 60000 }
                                }
                            }
                        }
                    }

                    Row {
                        spacing: 8
                        Text { text: "LOG LEVEL"; width: 95; height: 32; verticalAlignment: Text.AlignVCenter; color: "#777"; font.family: "Poppins"; font.pixelSize: 10 }

                        ComboBox {
                            id: logLevel
                            width: 180
                            model: ["Normal", "Debug", "Trace"]
                            currentIndex: discovery.logLevel === "Trace" ? 2 : (discovery.logLevel === "Debug" ? 1 : 0)
                        }

                        Text {
                            text: logLevel.currentText === "Trace"
                                  ? "packet sizes + state + sequence"
                                  : (logLevel.currentText === "Debug"
                                     ? "handshake + commands + recovery"
                                     : "important events only")
                            color: "#666"
                            font.family: "Poppins"
                            font.pixelSize: 10
                            height: 32
                            verticalAlignment: Text.AlignVCenter
                        }
                    }

                    Text {
                        width: parent.width
                        wrapMode: Text.WordWrap
                        text: "Password, session keys and cookie values are never written to logs."
                        color: "#666"
                        font.family: "Poppins"
                        font.pixelSize: 10
                    }
                }
            }

            Rectangle {
                width: panelWidth
                height: 52
                radius: 6
                color: saveMouse.containsMouse ? "#247f75" : "#1e665e"

                Text {
                    anchors.centerIn: parent
                    text: "SAVE SETTINGS & RECONNECT"
                    color: "white"
                    font.family: "Poppins"
                    font.bold: true
                    font.pixelSize: 12
                }

                MouseArea {
                    id: saveMouse
                    anchors.fill: parent
                    hoverEnabled: true
                    cursorShape: Qt.PointingHandCursor

                    onClicked: discovery.saveAndReconnect(
                        emailField.text,
                        passwordField.text,
                        l530Enabled.checked,
                        l530Name.text,
                        l530Ip.text,
                        p110Enabled.checked,
                        p110Name.text,
                        p110Ip.text,
                        frameSkip.text,
                        minDelta.text,
                        reconnectMs.text,
                        logLevel.currentText
                    )
                }
            }

            Text {
                text: "ACTIVE DEVICES"
                color: "#666"
                font.family: "Poppins"
                font.pixelSize: 10
                font.letterSpacing: 1.2
            }

            Repeater {
                model: service.controllers

                delegate: Rectangle {
                    width: panelWidth
                    height: 74
                    radius: 6
                    color: card
                    border.color: "#303030"

                    property var dev: model.modelData.obj

                    Rectangle {
                        width: 4
                        height: parent.height
                        color: dev.deviceType === "l530" ? "#00b4d8" : "#f0a54a"
                        radius: 2
                    }

                    Column {
                        x: 18
                        y: 10
                        spacing: 3

                        Text {
                            text: dev.name
                            color: theme.primarytextcolor
                            font.family: "Poppins"
                            font.bold: true
                            font.pixelSize: 14
                        }

                        Text {
                            text: dev.deviceType.toUpperCase() + " • " + dev.ip + ":80"
                            color: "#888"
                            font.family: "Poppins"
                            font.pixelSize: 10
                        }

                        Text {
                            text: "Direct KLAP v2"
                            color: "#5f9f98"
                            font.family: "Poppins"
                            font.pixelSize: 10
                        }
                    }
                }
            }

            Item { width: 1; height: 20 }
        }
    }
}
