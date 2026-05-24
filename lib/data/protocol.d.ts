declare const _default: {
    types: {
        varint: string;
        pstring: string;
        "16": string;
        i32: string;
        u8: string;
        u64: string;
        f64: string;
        bool: string;
        string: (string | {
            countType: string;
        })[];
        uuid: (string | {
            count: number;
        })[];
        byte_array: (string | {
            countType: string;
            type: string;
        })[];
        icon: (string | {
            count: number;
            type: (string | {
                count: number;
                type: string;
            })[];
        })[];
        player_state_struct: (string | ({
            name: string;
            type: string;
        } | {
            name: string;
            type: string[];
        })[])[];
        client_group: (string | ({
            name: string;
            type: string;
        } | {
            name: string;
            type: (string | {
                type: string;
                mappings: {
                    "0": string;
                    "1": string;
                    "2": string;
                };
            })[];
        })[])[];
        volume_category: (string | ({
            name: string;
            type: string;
        } | {
            name: string;
            type: string[];
        })[])[];
    };
    channels: {
        types: {
            add_category: (string | {
                name: string;
                type: string;
            }[])[];
            add_group: (string | {
                name: string;
                type: string;
            }[])[];
            create_group: (string | ({
                name: string;
                type: string;
            } | {
                name: string;
                type: (string | {
                    type: string;
                    mappings: {
                        "0": string;
                        "1": string;
                        "2": string;
                    };
                })[];
            })[])[];
            joined_group: (string | ({
                name: string;
                type: string[];
            } | {
                name: string;
                type: string;
            })[])[];
            set_group: (string | ({
                name: string;
                type: string;
            } | {
                name: string;
                type: string[];
            })[])[];
            leave_group: (string | any[])[];
            player_state: (string | {
                name: string;
                type: string;
            }[])[];
            player_states: (string | {
                name: string;
                type: (string | {
                    countType: string;
                    type: string;
                })[];
            }[])[];
            remove_category: (string | {
                name: string;
                type: string;
            }[])[];
            remove_group: (string | {
                name: string;
                type: string;
            }[])[];
            request_secret: (string | {
                name: string;
                type: string;
            }[])[];
            secret: (string | {
                name: string;
                type: string;
            }[])[];
            update_state: (string | {
                name: string;
                type: string;
            }[])[];
        };
    };
    udp: {
        types: {
            client_network_message: (string | ({
                name: string;
                type: string;
            } | {
                name: string;
                type: (string | {
                    countType: string;
                    type: string;
                })[];
            })[])[];
            server_network_message: (string | ({
                name: string;
                type: string;
            } | {
                name: string;
                type: (string | {
                    countType: string;
                    type: string;
                })[];
            })[])[];
            packet: (string | ({
                name: string;
                type: (string | {
                    type: string;
                    mappings: {
                        "1": string;
                        "2": string;
                        "3": string;
                        "4": string;
                        "5": string;
                        "6": string;
                        "7": string;
                        "8": string;
                        "9": string;
                        "10": string;
                    };
                })[];
            } | {
                name: string;
                type: (string | {
                    compareTo: string;
                    fields: {
                        MicPacket: string;
                        PlayerSoundPacket: string;
                        GroupSoundPacket: string;
                        LocationSoundPacket: string;
                        AuthenticatePacket: string;
                        AuthenticateAckPacket: string;
                        PingPacket: string;
                        KeepAlivePacket: string;
                        ConnectionCheckPacket: string;
                        ConnectionCheckAckPacket: string;
                    };
                    default: string;
                })[];
            })[])[];
            AuthenticatePacket: (string | {
                name: string;
                type: string;
            }[])[];
            AuthenticateAckPacket: (string | any[])[];
            ConnectionCheckPacket: (string | any[])[];
            ConnectionCheckAckPacket: (string | any[])[];
            PingPacket: (string | {
                name: string;
                type: string;
            }[])[];
            KeepAlivePacket: (string | any[])[];
            PlayerSoundPacket: (string | ({
                name: string;
                type: string;
            } | {
                name: string;
                type: (string | {
                    name: string;
                    size: number;
                    signed: boolean;
                }[])[];
            } | {
                name: string;
                type: (string | {
                    compareTo: string;
                    fields: {
                        "1": string;
                    };
                    default: string;
                })[];
            })[])[];
            GroupSoundPacket: (string | ({
                name: string;
                type: string;
            } | {
                name: string;
                type: (string | {
                    name: string;
                    size: number;
                    signed: boolean;
                }[])[];
            } | {
                name: string;
                type: (string | {
                    compareTo: string;
                    fields: {
                        "1": string;
                    };
                    default: string;
                })[];
            })[])[];
            LocationSoundPacket: (string | ({
                name: string;
                type: string;
            } | {
                name: string;
                type: (string | {
                    name: string;
                    type: string;
                }[])[];
            } | {
                name: string;
                type: (string | {
                    name: string;
                    size: number;
                    signed: boolean;
                }[])[];
            } | {
                name: string;
                type: (string | {
                    compareTo: string;
                    fields: {
                        "1": string;
                    };
                    default: string;
                })[];
            })[])[];
            MicPacket: (string | {
                name: string;
                type: string;
            }[])[];
        };
    };
};
export default _default;
//# sourceMappingURL=protocol.d.ts.map