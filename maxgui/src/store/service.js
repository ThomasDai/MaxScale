/*
 * Copyright (c) 2020 MariaDB Corporation Ab
 *
 * Use of this software is governed by the Business Source License included
 * in the LICENSE.TXT file and at www.mariadb.com/bsl11.
 *
 * Change Date: 2024-07-16
 *
 * On the date above, in accordance with the Business Source License, use
 * of this software will be governed by version 2 or later of the General
 * Public License.
 */

export default {
    namespaced: true,
    state: {
        allServices: [],
        // listenersByServiceIdMap: new Map(),
        currentService: {},
        totalConnectionsChartData: {
            datasets: [],
        },
        connectionInfo: {},
    },
    mutations: {
        /**
         * @param {Array} payload payload Array
         */
        setServices(state, payload) {
            state.allServices = payload
        },
        setCurrentService(state, payload) {
            state.currentService = payload
        },
        setTotalConnectionsChartData(state, payload) {
            state.totalConnectionsChartData = payload
        },
        setConnectionInfo(state, payload) {
            state.connectionInfo = payload
        },
    },
    actions: {
        async fetchServiceById({ commit }, id) {
            try {
                let res = await this.vue.$axios.get(`/services/${id}`)
                if (res.data.data) {
                    commit('setCurrentService', res.data.data)
                }
            } catch (e) {
                if (process.env.NODE_ENV !== 'test') {
                    const logger = this.vue.$logger('store-service-fetchServiceById')
                    logger.error(e)
                }
            }
        },
        genDataSetSchema({ commit, state }) {
            const {
                currentService: { attributes: { connections = null } = {} },
            } = state
            if (connections !== null) {
                let lineColors = this.vue.$help.dynamicColors(0)
                let indexOfOpacity = lineColors.lastIndexOf(')') - 1
                let dataset = [
                    {
                        label: `Current connections`,
                        type: 'line',
                        // background of the line
                        backgroundColor: this.vue.$help.strReplaceAt(
                            lineColors,
                            indexOfOpacity,
                            '0.2'
                        ),
                        borderColor: lineColors,
                        borderWidth: 1,
                        lineTension: 0,

                        data: [{ x: Date.now(), y: connections }],
                    },
                ]

                let totalConnectionsChartDataSchema = {
                    datasets: dataset,
                }
                commit('setTotalConnectionsChartData', totalConnectionsChartDataSchema)
            }
        },
        async fetchAllServices({ commit }) {
            try {
                let res = await this.vue.$axios.get(`/services`)
                if (res.data.data) commit('setServices', res.data.data)
            } catch (e) {
                if (process.env.NODE_ENV !== 'test') {
                    const logger = this.vue.$logger('store-services-fetchAllServices')
                    logger.error(e)
                }
            }
        },
        async fetchServiceConnections({ commit }, id) {
            try {
                let res = await this.vue.$axios.get(
                    `/services/${id}?fields[services]=connections,total_connections`
                )
                if (res.data.data) {
                    let { attributes: { connections, total_connections } = {} } = res.data.data
                    commit('setConnectionInfo', {
                        total_connections: total_connections,
                        connections: connections,
                    })
                }
            } catch (e) {
                if (process.env.NODE_ENV !== 'test') {
                    const logger = this.vue.$logger('store-service-fetchServiceConnections')
                    logger.error(e)
                }
            }
        },

        //-----------------------------------------------Service Create/Update/Delete----------------------------------
        /**
         * @param {Object} payload payload object
         * @param {String} payload.id Name of the service
         * @param {String} payload.router The router module to use
         * @param {Object} payload.parameters Parameters for the service
         * @param {Object} payload.relationships The relationships of the service to other resources
         * @param {Object} payload.relationships.servers servers object
         * @param {Object} payload.relationships.filters filters object
         * @param {Function} payload.callback callback function after successfully updated
         */
        async createService({ commit }, payload) {
            try {
                const body = {
                    data: {
                        id: payload.id,
                        type: 'services',
                        attributes: {
                            router: payload.router,
                            parameters: payload.parameters,
                        },
                        relationships: payload.relationships,
                    },
                }
                let res = await this.vue.$axios.post(`/services/`, body)

                // response ok
                if (res.status === 204) {
                    commit(
                        'showMessage',
                        {
                            text: [`Service ${payload.id} is created`],
                            type: 'success',
                        },
                        { root: true }
                    )
                    if (this.vue.$help.isFunction(payload.callback)) await payload.callback()
                }
            } catch (e) {
                if (process.env.NODE_ENV !== 'test') {
                    const logger = this.vue.$logger('store-service-createService')
                    logger.error(e)
                }
            }
        },
        //-----------------------------------------------Service parameter update---------------------------------
        /**
         * @param {Object} payload payload object
         * @param {String} payload.id Name of the service
         * @param {Object} payload.parameters Parameters for the service
         * @param {Function} payload.callback callback function after successfully updated
         */
        async updateServiceParameters({ commit }, payload) {
            try {
                const body = {
                    data: {
                        id: payload.id,
                        type: 'services',
                        attributes: { parameters: payload.parameters },
                    },
                }
                let res = await this.vue.$axios.patch(`/services/${payload.id}`, body)
                // response ok
                if (res.status === 204) {
                    commit(
                        'showMessage',
                        {
                            text: [`Parameters of ${payload.id} is updated`],
                            type: 'success',
                        },
                        { root: true }
                    )
                    if (this.vue.$help.isFunction(payload.callback)) await payload.callback()
                }
            } catch (e) {
                if (process.env.NODE_ENV !== 'test') {
                    const logger = this.vue.$logger('store-service-updateServiceParameters')
                    logger.error(e)
                }
            }
        },
        //-----------------------------------------------Service relationship update---------------------------------
        /**
         * @param {Object} payload payload object
         * @param {String} payload.id Name of the service
         * @param {Array} payload.servers servers array
         * @param {Array} payload.filters filters array
         * @param {Object} payload.type Type of relationships
         * @param {Function} payload.callback callback function after successfully updated
         */
        async updateServiceRelationship({ commit }, payload) {
            try {
                let res
                let message

                res = await this.vue.$axios.patch(
                    `/services/${payload.id}/relationships/${payload.type}`,
                    {
                        data: payload.type === 'servers' ? payload.servers : payload.filters,
                    }
                )
                message = [
                    `${this.vue.$help.capitalizeFirstLetter(payload.type)} relationships of ${
                        payload.id
                    } is updated`,
                ]

                // response ok
                if (res.status === 204) {
                    commit(
                        'showMessage',
                        {
                            text: message,
                            type: 'success',
                        },
                        { root: true }
                    )
                    if (this.vue.$help.isFunction(payload.callback)) await payload.callback()
                }
            } catch (e) {
                if (process.env.NODE_ENV !== 'test') {
                    const logger = this.vue.$logger('store-service-updateServiceRelationship')
                    logger.error(e)
                }
            }
        },
        /**
         * @param {String} id id of the service
         */
        async destroyService({ dispatch, commit }, id) {
            try {
                let res = await this.vue.$axios.delete(`/services/${id}?force=yes`)
                // response ok
                if (res.status === 204) {
                    await dispatch('fetchAllServices')
                    commit(
                        'showMessage',
                        {
                            text: [`Service ${id} is deleted`],
                            type: 'success',
                        },
                        { root: true }
                    )
                }
            } catch (e) {
                if (process.env.NODE_ENV !== 'test') {
                    const logger = this.vue.$logger('store-service-destroyService')
                    logger.error(e)
                }
            }
        },
        /**
         * @param {String} id id of the service
         * @param {String} mode Mode to start or stop service
         */
        async stopOrStartService({ commit }, { id, mode, callback }) {
            try {
                let res = await this.vue.$axios.put(`/services/${id}/${mode}`)
                let message
                switch (mode) {
                    case 'start':
                        message = [`Service ${id} is started`]
                        break
                    case 'stop':
                        message = [`Service${id} is stopped`]
                        break
                }
                // response ok
                if (res.status === 204) {
                    commit(
                        'showMessage',
                        {
                            text: message,
                            type: 'success',
                        },
                        { root: true }
                    )
                    if (this.vue.$help.isFunction(callback)) await callback()
                }
            } catch (e) {
                if (process.env.NODE_ENV !== 'test') {
                    const logger = this.vue.$logger('store-service-stopOrStartService')
                    logger.error(e)
                }
            }
        },
    },
    getters: {
        allServices: state => state.allServices,
        currentService: state => state.currentService,

        totalConnectionsChartData: state => state.totalConnectionsChartData,
        connectionInfo: state => state.connectionInfo,
        // -------------- below getters are available only when fetchAllServices has been dispatched
        allServicesMap: state => {
            let map = new Map()
            state.allServices.forEach(ele => {
                map.set(ele.id, ele)
            })
            return map
        },

        allServicesInfo: state => {
            let idArr = []
            return state.allServices.reduce((accumulator, _, index, array) => {
                idArr.push(array[index].id)
                return (accumulator = { idArr: idArr })
            }, [])
        },
    },
}