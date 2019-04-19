import React, { Component } from "react";
import { ajaxGet, ajaxPost, tlPath, asyncAjaxGet } from "COMMON/common";
import { Modal, Switch, Icon , Radio, Form, Input, Cascader, message } from "antd";
// const { Option } = Select;
const echarts = require("echarts");
let myCharts;

function hasErrors(fieldsError) {
  return Object.keys(fieldsError).some(field => fieldsError[field]);
}

class ChangeBatchForm extends Component {
  constructor(props) {
    super(props);
    this.state = {
      showSetBatchPart: false
    };
    this.handleSubmit = this.handleSubmit.bind(this);
    this.handleRadioChange = this.handleRadioChange.bind(this);
    this.changeBatchType = this.changeBatchType.bind(this);
    this.filter = this.filter.bind(this);
  }
  componentWillReceiveProps(nextProps) {
    const { setFieldsValue } = this.props.form;
    const { batch } = nextProps;
    // console.log(taskParam)

    if (batch.BatchCode !== this.props.batch.BatchCode) {
      setFieldsValue({ PlanAmount: batch.PlanAmount });
    }
  }
  changeBatchType(value) {
    // console.log(value)

    // this.setState({ batchType: value });
    this.props.form.setFieldsValue({
      batchType: `${value}`
      // batchData:batchDataObj[value][0]
    });
  }

  filter(inputValue, path) {
    return path.some(
      option =>
        option.label.toLowerCase().indexOf(inputValue.toLowerCase()) > -1
    );
  }
  handleRadioChange(e) {
    this.setState({ showSetBatchPart: e.target.value });
  }
  handleSubmit(e) {
    e.preventDefault();
    this.props.form.validateFields((err, values) => {
      if (!err) {
        const { batch, handleCancel, getDatas } = this.props;
        console.log("Received values of form: ", values, batch);

        // 取消生产
        if (!values.ifChangePruduct) {
          ajaxPost(`${tlPath}/CancelBatch`, {
            batchCode: batch.BatchCode,
            mixingStationCode: batch.MixingStation.Code
          }).then(res => {
            if (!res.isException) {
              message.success("取消成功！");
              handleCancel();
              getDatas();
            } else {
              message.error(res.errorMessage);
            }
          });
        } else {
          // 调整批次大小
          if (!values.ortherBatchCode[1]) {
            Modal.info({
              title: `${values.ortherBatchCode[0]},没有可转移的批次！`
            });
            return;
          }
          ajaxPost(`${tlPath}/ChangeBatchCube`, {
            batchCode: batch.BatchCode,
            mixingStationCode: batch.MixingStation.Code,
            cube: values.cube,
            ortherBatchCode: values.ortherBatchCode[1]
          })
            .then(res => {
              if (!res.isException) {
                message.success("调整成功！");
                handleCancel();
                getDatas();
              } else {
                message.error("调整失败！");
              }
            })
            .catch(error => {
              message.error(error.statusText);
            });
        }
      }
    });
    return;
  }
  createOption() {
    const { data, batch } = this.props;
    // 生成同一个拌台下的非自身的数据，同一任务下
    const onTheSameStation = data.filter(
      item =>
        batch.MixingStation &&
        item.MixingStation.Code === batch.MixingStation.Code &&
        item.BatchCode !== batch.BatchCode &&
        item.ParentTaskOrderId === batch.ParentTaskOrderId
    );
    const onOtherStation = data.filter(
      item =>
        batch.MixingStation &&
        item.MixingStation.Code !== batch.MixingStation.Code &&
        item.BatchCode !== batch.BatchCode &&
        item.ParentTaskOrderId === batch.ParentTaskOrderId
    );

    const createChildren = datas =>
      datas.map(item => ({
        ...item,
        value: item.BatchCode,
        label: item.BatchCode
      }));
    // const options=[]
    const options = [
      {
        value: "同一拌台",
        label: "同一拌台",
        children: createChildren(onTheSameStation)
      },
      {
        value: "其他",
        label: "其他",
        children: createChildren(onOtherStation)
      }
    ];
    return options;
  }
  render() {
    const { showBatchModal, handleCancel, batch } = this.props,
      { showSetBatchPart } = this.state;
    const {
      getFieldDecorator,
      getFieldsError,
      getFieldValue
    } = this.props.form;
    const formItemLayout = {
      labelCol: {
        xs: { span: 24 },
        sm: { span: 6 }
      },
      wrapperCol: {
        xs: { span: 24 },
        sm: { span: 18 }
      }
    };
    const options = this.createOption();
    const batchType = getFieldValue("batchType");
    // console.log(batchType,batchDataObj[batchType])
    return (
      <Modal
        title="调整批次"
        visible={showBatchModal}
        // footer={null}
        onCancel={handleCancel}
        onOk={this.handleSubmit}
      >
        {/* <Radio checked={true}>取消生产</Radio>
        <Radio>调整大小</Radio> */}
        <Form layout={"horizontal"}>
          <Form.Item label="">
            {getFieldDecorator("ifChangePruduct", {
              initialValue: showSetBatchPart
            })(
              <Radio.Group onChange={this.handleRadioChange}>
                <Radio value={false}>取消生产</Radio>
                <Radio value={true}>调整大小</Radio>
              </Radio.Group>
            )}
          </Form.Item>
          {showSetBatchPart && [
            <Form.Item label="生产量" {...formItemLayout}>
              {getFieldDecorator("cube", {
                initialValue: batch.PlanAmount,
                rules: [
                  {
                    required: true,
                    message: "请输入调整后的生产量"
                  }
                ]
              })(<Input type={"number"} />)}
            </Form.Item>,
            <Form.Item label="减少量转移到" {...formItemLayout}>
              {getFieldDecorator("ortherBatchCode", {
                initialValue: batchType
              })(
                <Cascader
                  options={options}
                  onChange={this.changeBatchType}
                  showSearch={{ filter: this.filter }}
                  placeholder="请选择对应批次号"
                />
              )}
            </Form.Item>
          ]}
        </Form>
      </Modal>
    );
  }
}
const WrappedChangeBatchForm = Form.create({ name: "changeBatchForm" })(
  ChangeBatchForm
);

export default class Gantt extends Component {
  constructor(props) {
    super(props);
    this.state = {
      showBatchModal: false,
      batch: {}
    };
    // this.handleSubmit=this.handleSubmit.bind(this)
  }

  componentDidMount() {
    // this.getDatas(this.props)
  }
  componentWillReceiveProps(nextProps) {
    if (this.props.configDatas.FBt !== nextProps.configDatas.FBt) {
      this.getDatas(nextProps);
    } else if (
      this.props.freshTaskBatchs.time !== nextProps.freshTaskBatchs.time
    ) {
      this.getDatas(nextProps, null, nextProps.freshTaskBatchs.datas);
    }
  }
  getDatas(props = this.props, option, d) {
    const { mixingStation } = props;
    const mixingstationCodes = mixingStation.map(item => item.Code);
    const colors = ["#ed145b", "#ffcc41", "#78a7e5", "#01d7e1", "#9ab9be"];
    let color = {},
      currentIndex = 0;

    const makeData = datas => {
      const data = datas.map((item, i) => {
        if (!color[item.ParentTaskOrderId]) {
          color[item.ParentTaskOrderId] = colors[currentIndex % 5];
          currentIndex++;
        }
        return {
          ...item,
          name: item.BatchCode,
          value: [
            // item.MixingStation.Code, //index
            item.ParentTaskOrderCode, //index
            new Date(item.PlanStartDate).getTime() /* 开始时间 */,
            new Date(item.PlanFinishDate).getTime() /* 结束时间 */,
            item.MixingStation.Speed //速度
          ],
          itemStyle: {
            normal: {
              // color: "#FF6600"
              color: color[item.ParentTaskOrderId]
            }
          }
        };
      });

      this.setState({ data });
      // if(option){
      //   option.series={data}
      //   myCharts.setOption(option)
      // }else{
      this.drawGantt(props, data, option);
      // }
    };
    if (d) {
      makeData(d);
    } else {
      ajaxPost(`${tlPath}/GetProductionTaskBatchs`, {
        mixingstationCodes
      }).then(res => {
        if (!res.isException) {
          makeData(res.data);
        }
      });
    }
  }
  drawGantt(props, data, op) {
    // console.error(data)
    // if(data.length) return;
    // 基于准备好的dom，初始化echarts实例
    if (myCharts && myCharts.dispose) {
      myCharts.dispose();
    }
    console.log(">>>>>>chognhui>>>>>>>>");
    const _this = this,
      { mixingStation } = props;
    let HEIGHT_RATIO = 0.6;
    let DIM_CATEGORY_INDEX = 0;
    let DIM_TIME_ARRIVAL = 1;
    let DIM_TIME_DEPARTURE = 2;
    let DIM_MIXER_SPEED = 3;
    let DATA_ZOOM_AUTO_MOVE_THROTTLE = 30;
    let DATA_ZOOM_X_INSIDE_INDEX = 1; //1
    // let DATA_ZOOM_Y_INSIDE_INDEX = 2; //3
    let DATA_ZOOM_AUTO_MOVE_SPEED = 0.2;
    let DATA_ZOOM_AUTO_MOVE_DETECT_AREA_WIDTH = 30;
    let _draggingTimeLength;
    let _draggable = true;
    let _draggingEl;
    let _dropShadow;
    let _draggingCursorOffset = [0, 0];
    let _draggingRecord;
    let _dropRecord;
    let _cartesianXBounds = [];
    let _rawData;
    let _autoDataZoomAnimator;

    let clickTimer;
    myCharts = echarts.init(document.getElementById("gantt-container"));

    let startTime = +new Date(
      new Date(new Date().toLocaleDateString()).getTime()
    ); /* 开始时间 00:00*/
    // let categories = mixingStation.filter(item=>item.Code!=='全部').map(item => item.Code+'') || [];//去除“全部”
    let categories = data.map(item => item.ParentTaskOrderCode + "") || []; //去除“全部”

    _rawData = [...data];

    function renderItem(params, api) {
      const { mixingStation } = _this.props;
      const speedArr = mixingStation.map(item =>
        item.Speed ? item.Speed - 0 : 0
      );
      const maxSpeed = Math.max(...speedArr); //拌台最大速度
      let categoryIndex = api.value(DIM_CATEGORY_INDEX);
      let start = api.coord([api.value(DIM_TIME_ARRIVAL), categoryIndex]);
      let end = api.coord([api.value(DIM_TIME_DEPARTURE), categoryIndex]);
      // let height = api.size([0, 1])[1] * (api.value(DIM_MIXER_SPEED)/maxSpeed)*0.9/mixingStation.length;
      let height = api.size([0, 1])[1] * HEIGHT_RATIO;

      var coordSys = params.coordSys;
      _cartesianXBounds[0] = coordSys.x;
      _cartesianXBounds[1] = coordSys.x + coordSys.width;

      let rectShape = echarts.graphic.clipRectByRect(
        {
          x: start[0],
          y: start[1] - height / 2,
          width: end[0] - start[0],
          height: height
        },
        {
          x: params.coordSys.x,
          y: params.coordSys.y,
          width: params.coordSys.width,
          height: params.coordSys.height
        }
      );

      return (
        rectShape && {
          type: "rect",
          shape: rectShape,
          style: api.style()
        }
      );
    }
    const now = new Date().getTime();
    const startValue = now - 1000 * 60 * 60 * 2,
      endValue = now + 1000 * 60 * 60 * 4;
    // console.error(nowHours,start,end)
    let option = {
      
      tooltip: {
        // trigger: 'axis',
        // axisPointer: {
        //     type: 'shadow'
        // },
        
        formatter: function(params) {
          if (params.componentType === "markLine") {
            return;
          }
          return `${params.marker} ${params.data.BatchCode}<br/> 
                任务单号：${params.data.ParentTaskOrderCode}<br/> 
                计划生产方量：${params.data.PlanAmount}<br/> 
                拌台速度：${params.data.MixingStation.Speed}<br/>
                开始时间：${new Date(params.data.PlanStartDate).format(
                  "yyyy-MM-dd hh:mm:ss"
                )}<br/>
                结束时间：${new Date(params.data.PlanFinishDate).format(
                  "yyyy-MM-dd hh:mm:ss"
                )}<br/>
                待生产：${parseFloat(params.data.Cube || 0).toFixed(2)}<br/>
                已完成：${parseFloat(params.data.FinishedAmount || 0).toFixed(
                  2
                )}<br/>
                是否能调整：${params.data.IsFixed ? "否" : "是"}<br/>
                `;
        }
      },
      // title: {
      //     text: 'Profile',
      //     left: '0'
      // },
      toolbox: {
        right: 20,
        top: 20,
        itemSize: 20,
        feature: {
          myCenter: {
            show: true,
            title: "当前",
            icon: "image://http://echarts.baidu.com/images/favicon.png",
            onclick: function() {
              // 回到当前时间,并且获取最新数据
              _this.getDatas(props);
            }
          }
        }
      },
      dataZoom: [
        {
          type: "slider",
          filterMode: "weakFilter",
          // start,
          // end,
          startValue,
          endValue,
          showDataShadow: false,
          // top: 400,
          height: 10,
          borderColor: "transparent",
          backgroundColor: "#e2e2e2",
          handleIcon:
            "M10.7,11.9H9.3c-4.9,0.3-8.8,4.4-8.8,9.4c0,5,3.9,9.1,8.8,9.4h1.3c4.9-0.3,8.8-4.4,8.8-9.4C19.5,16.3,15.6,12.2,10.7,11.9z M13.3,24.4H6.7v-1.2h6.6z M13.3,22H6.7v-1.2h6.6z M13.3,19.6H6.7v-1.2h6.6z", // jshint ignore:line
          handleSize: 20,
          handleStyle: {
            shadowBlur: 6,
            shadowOffsetX: 1,
            shadowOffsetY: 2,
            shadowColor: "#aaa"
          },
          labelFormatter: ""
        },
        {
          type: "inside",
          id: "insideX",
          xAxisIndex: 0,
          filterMode: "weakFilter",
          // start,
          // end,
          // disabled: true,
          zoomOnMouseWheel: false,
          moveOnMouseMove: false
        },
        {
          type: "slider",
          yAxisIndex: 0,
          zoomLock: false,
          width: 10,
          right: 10,
          top: 70,
          bottom: 20,
          start: 90,
          end: 100,
          handleSize: 10,
          showDetail: false
        },
        {
          type: "inside",
          id: "insideY",
          yAxisIndex: 0,
          start: 95,
          end: 100,
          zoomOnMouseWheel: false,
          moveOnMouseMove: true,
          moveOnMouseWheel: true
        }
      ],
      grid: {
        left: 80
        // height:'100%'
      },
      xAxis: {
        // min: startTime,
        scale: true,
        position: "top",
        splitLine: {
          lineStyle: {
            color: ["#E9EDFF"]
          }
        },
        axisLine: {
          show: false
        },
        axisTick: {
          lineStyle: {
            color: "#929ABA"
          }
        },
        axisLabel: {
          color: "#929ABA",
          inside: false,
          //     align: 'center'
          // }
          //   axisLabel: {
          //     color: "#333",
          formatter: function(val) {
            return new Date(val).format("yyyy-MM-dd\nhh:mm");
            // return Math.max(0, val - startTime) + ' ms';
          }
        }
        // axisLine: {
        //   lineStyle: {
        //     color: "#D1D9E2"
        //   }
        // }
      },
      yAxis: {
        data: categories,
        axisLine: {
          show: false
        },
        axisTick: {
          show: false
        },
        axisLabel: {
          color: "#2F80EC",
          // borderRadius: 50,
          // backgroundColor: "#2F80EC",
          padding: [8, 14]
        }
      },
      series: [
        {
          type: "custom",
          renderItem: renderItem,
          itemStyle: {
            normal: {
              opacity: 0.8
            }
          },
          encode: {
            x: [1, 2],
            y: 0
          },
          label: {
            normal: {
              show: true,
              position: "insideLeft",
              formatter: params => {
                // console.error(params)
                // const duration = parseFloat(params.value[3] / 60000).toFixed(1);
                return params.data.PlanAmount + "方";
              }
            }
          },
          markLine: {
            symbol: "none",
            label: {
              normal: {
                show: true,
                position: "start",
                formatter: params => {
                  return (
                    "当前：" + new Date(params.value).format("hh:mm yyyy-MM-dd")
                  );
                }
              }
            },
            data: [
              {
                name: "现在",
                xAxis: new Date()
              }
            ]
          },
          data
        }
      ],
      ...op
    };
    myCharts.setOption(option);

    initDrag();

    // 双击,取消生产或者调整生产量大小
    myCharts.on("dblclick", param => {
      // 开始时间早于过去，则代表已经开始生产，不能进行批次调整
      if (new Date(param.data.PlanStartDate).getTime() < new Date().getTime()) {
        message.info("批次已生产，无法操作！");
        return false;
      } else if (param.data.IsFixed) {
        message.info("任务单参数设置固定，无法操作！");
        return false;
      }
      _this.setState({ showBatchModal: true, batch: param.data, data });
    });

    // 初始化拖拽事件
    function initDrag() {
      _autoDataZoomAnimator = makeAnimator(dispatchDataZoom);

      myCharts.on("mousedown", function(param) {
        if (clickTimer) {
          clearTimeout(clickTimer);
          clickTimer = null;
        }
        onDragSwitchClick(true);
        clickTimer = setTimeout(() => {
          if (
            !_draggable ||
            !param ||
            param.seriesIndex == null ||
            // param.data.name === "暂停" ||
            param.value[DIM_TIME_ARRIVAL] < now //在当前时间以前的不能拖拽
          ) {
            return;
          }
          // Drag start
          _draggingRecord = {
            dataIndex: param.dataIndex,
            categoryIndex: param.value[DIM_CATEGORY_INDEX],
            timeArrival: param.value[DIM_TIME_ARRIVAL],
            timeDeparture: param.value[DIM_TIME_DEPARTURE],
            mixerSpeed: param.value[DIM_MIXER_SPEED],
            IsFixed: param.IsFixed
          };
          // console.log(param,_draggingRecord)
          let style = {
            lineWidth: 2,
            fill: "rgba(255,0,0,0.1)",
            stroke: "rgba(255,0,0,0.8)",
            lineDash: [6, 3]
          };

          _draggingEl = addOrUpdateBar(
            _draggingEl,
            _draggingRecord,
            style,
            100
          );
          _draggingCursorOffset = [
            _draggingEl.position[0] - param.event.offsetX,
            _draggingEl.position[1] - param.event.offsetY
          ];
          _draggingTimeLength =
            _draggingRecord.timeDeparture - _draggingRecord.timeArrival;
        }, 200);
      });

      myCharts.getZr().on("mousemove", function(event) {
        if (!_draggingEl) {
          return;
        }
        // if(_draggingRecord.IsFixed){
        //   message.info('批次固定，无法调整');
        //   return;
        // }
        let cursorX = event.offsetX;
        let cursorY = event.offsetY;

        // Move _draggingEl.
        _draggingEl.attr("position", [
          _draggingCursorOffset[0] + cursorX,
          _draggingCursorOffset[1] + cursorY
        ]);

        prepareDrop();

        autoDataZoomWhenDraggingOutside(cursorX, cursorY);
      });

      myCharts.getZr().on("mouseup", function(param) {
        // Drop
        // onDragSwitchClick(false)
        setTimeout(() => {
          if (_draggingEl && _dropRecord) {
            // todo:拖拽结束后 调用交换批次的接口，接口返回成功后重新渲染甘特图，如果成功后接口么有返回新数据，要自己重新获取新数据
            updateRawData() &&
              myCharts.setOption({
                series: {
                  data: _rawData
                }
              });
          }
          dragRelease();
        }, 200);
      });
      myCharts.getZr().on("globalout", dragRelease);

      // 拖动前禁用insideX，否则拖拽的时候回同时移动indexX
      function onDragSwitchClick(_draggable) {
        // _draggable = !_draggable;
        myCharts.setOption({
          dataZoom: [
            {
              id: "insideX",
              disabled: _draggable
            }
          ]
        });
      }

      function dragRelease() {
        _autoDataZoomAnimator.stop();

        if (_draggingEl) {
          myCharts.getZr().remove(_draggingEl);
          _draggingEl = null;
        }
        if (_dropShadow) {
          myCharts.getZr().remove(_dropShadow);
          _dropShadow = null;
        }
        _dropRecord = _draggingRecord = null;
      }

      // 在甘特图上添加拖动的块或者放置目标的阴影
      function addOrUpdateBar(el, itemData, style, z) {
        // todo:itemData一样 为什么pointArrival不一样
        let pointArrival = myCharts.convertToPixel("grid", [
          itemData.timeArrival,
          itemData.categoryIndex
        ]);
        let pointDeparture = myCharts.convertToPixel("grid", [
          itemData.timeDeparture,
          itemData.categoryIndex
        ]);

        const speedArr = mixingStation.map(item =>
          item.Speed ? item.Speed - 0 : 0
        );
        const maxSpeed = Math.max(...speedArr); //拌台最大速度
        // console.log(myCharts.convertToPixel("grid", [0,0]));
        let barLength = pointDeparture[0] - pointArrival[0];
        let barHeight =
          (((Math.abs(
            myCharts.convertToPixel("grid", [0, 0])[1] -
              myCharts.convertToPixel("grid", [0, 1])[1]
          ) *
            itemData.mixerSpeed) /
            maxSpeed) *
            0.9) /
          mixingStation.length; //* HEIGHT_RATIO;

        if (!el) {
          el = new echarts.graphic.Rect({
            shape: { x: 0, y: 0, width: 0, height: 0 },
            style: style,
            z: z
          });
          myCharts.getZr().add(el);
        }
        el.attr({
          shape: { x: 0, y: 0, width: barLength, height: barHeight },
          position: [pointArrival[0], pointArrival[1] - barHeight / 2]
        });

        return el;
      }

      // 获取放置块的数据(及要交换的批次)
      function prepareDrop() {
        // Check droppable place.
        let xPixel = _draggingEl.shape.x + _draggingEl.position[0];
        let yPixel = _draggingEl.shape.y + _draggingEl.position[1];
        let cursorData = myCharts.convertFromPixel("grid", [xPixel, yPixel]);
        if (cursorData) {
          // Make drop shadow and _dropRecord
          const dropItem = _rawData.find(item => {
            // console.log(cursorData,item,item.value[DIM_CATEGORY_INDEX])
            if (
              Math.floor(cursorData[1]) == item.value[DIM_CATEGORY_INDEX] &&
              // item.name === "生产" &&
              item.value[DIM_TIME_ARRIVAL] < cursorData[0] &&
              item.value[DIM_TIME_DEPARTURE] > cursorData[0]
            ) {
              return true;
            }
          });

          if (dropItem) {
            _dropRecord = {
              categoryIndex: dropItem.value[DIM_CATEGORY_INDEX],
              timeArrival: dropItem.value[DIM_TIME_ARRIVAL],
              timeDeparture: dropItem.value[DIM_TIME_DEPARTURE],
              mixerSpeed: dropItem.value[DIM_MIXER_SPEED]
            };

            let style = { fill: "rgba(0,0,0,0.4)" };
            _dropShadow = addOrUpdateBar(_dropShadow, _dropRecord, style, 99);
          }

          // console.error(dropItem,_dropRecord)
          // _dropRecord = {
          //     categoryIndex: Math.floor(cursorData[1]),
          //     timeArrival: cursorData[0],
          //     timeDeparture: cursorData[0] + _draggingTimeLength
          // };

          // let style = {fill: 'rgba(0,0,0,0.4)'};
          // _dropShadow = addOrUpdateBar(_dropShadow, _dropRecord, style, 99);
        }
      }

      // 放置结束后的逻辑操作(调用接口等)
      function updateRawData() {
        let movingItem = _rawData[_draggingRecord.dataIndex];
        const now = new Date().getTime();
        // 放置到自己上或者是过去历史时间 返回 无效
        if (
          _dropRecord.categoryIndex === _draggingRecord.categoryIndex &&
          _dropRecord.timeArrival == _draggingRecord.timeArrival &&
          _dropRecord.timeDeparture == _draggingRecord.timeDeparture
        ) {
          // alert("Conflict! ");
          return;
        }
        if (_dropRecord.timeArrival < now) {
          alert("批次已进行生产，不能转！");
          return;
        }

        // No conflict.

        const dropItem = _rawData.find(
          item =>
            item.value[DIM_TIME_ARRIVAL] == _dropRecord.timeArrival &&
            item.value[DIM_TIME_DEPARTURE] == _dropRecord.timeDeparture
        );
        ajaxPost(`${tlPath}/ChangeBatchToAnotherMixingStation`, {
          batchCode: movingItem.BatchCode,
          fromMixingStationCode: movingItem.MixingStation.Code,
          toMixingStationCode: dropItem.MixingStation.Code,
          frontBatchCode: dropItem.BatchCode
        })
          .then(res => {
            if (!res.isException) {
              if (res.data) {
                const dataZoom = myCharts.getOption().dataZoom;
                _this.getDatas(_this.props, { dataZoom });
                message.success("操作成功！");
                return true;
              } else {
                message.error("任务参数限制，操作失败！");
              }
            }
          })
          .catch(res => {
            console.error(res);
            message.error(res.statusText);
          });
        return;
      }
      // 拖动到坐标边缘的时候 自动滚动
      function autoDataZoomWhenDraggingOutside(cursorX, cursorY) {
        // When cursor is outside the cartesian and being dragging,
        // auto move the dataZooms.
        let cursorDistX = getCursorCartesianDist(cursorX, _cartesianXBounds);
        // let cursorDistY = getCursorCartesianDist(cursorY, _cartesianYBounds);
        if (cursorDistX !== 0 /*|| cursorDistY !== 0*/) {
          _autoDataZoomAnimator.start({
            cursorDistX: cursorDistX
            // cursorDistY: cursorDistY||0
          });
        } else {
          _autoDataZoomAnimator.stop();
        }
      }

      function dispatchDataZoom(params) {
        let option = myCharts.getOption();

        let optionInsideX = option.dataZoom[DATA_ZOOM_X_INSIDE_INDEX];
        // let optionInsideY = option.dataZoom[DATA_ZOOM_Y_INSIDE_INDEX];
        let batch = [];
        // console.log(option.dataZoom)
        prepareBatch(
          batch,
          "insideX",
          optionInsideX.start,
          optionInsideX.end,
          params.cursorDistX
        );
        // prepareBatch(
        //   batch,
        //   "insideY",
        //   optionInsideY.start,
        //   optionInsideY.end,
        //   -params.cursorDistY
        // );

        batch.length &&
          myCharts.dispatchAction({
            type: "dataZoom",
            batch: batch
          });

        function prepareBatch(batch, id, start, end, cursorDist) {
          if (cursorDist === 0) {
            return;
          }
          let sign = cursorDist / Math.abs(cursorDist);
          let size = end - start;
          let delta = DATA_ZOOM_AUTO_MOVE_SPEED * sign;
          // let delta=2
          start += delta;
          end += delta;

          if (end > 100) {
            end = 100;
            start = end - size;
          }
          if (start < 0) {
            start = 0;
            end = start + size;
          }
          batch.push({
            dataZoomId: id,
            start: start,
            end: end
          });
        }
      }

      function getCursorCartesianDist(cursorXY, bounds) {
        let dist0 =
          cursorXY - (bounds[0] + DATA_ZOOM_AUTO_MOVE_DETECT_AREA_WIDTH);
        let dist1 =
          cursorXY - (bounds[1] - DATA_ZOOM_AUTO_MOVE_DETECT_AREA_WIDTH);
        return dist0 * dist1 <= 0
          ? 0 // cursor is in cartesian
          : dist0 < 0
          ? dist0 // cursor is at left/top of cartesian
          : dist1; // cursor is at right/bottom of cartesian
      }

      function makeAnimator(callback) {
        let requestId;
        let callbackParams;
        // Use throttle to prevent from calling dispatchAction frequently.
        // callback = myCharts.throttle(callback, DATA_ZOOM_AUTO_MOVE_THROTTLE);

        function onFrame() {
          callback(callbackParams);
          requestId = requestAnimationFrame(onFrame);
        }

        return {
          start: function(params) {
            callbackParams = params;
            if (requestId == null) {
              onFrame();
            }
          },
          stop: function() {
            if (requestId != null) {
              cancelAnimationFrame(requestId);
            }
            requestId = callbackParams = null;
          }
        };
      }
    }
  }
  handleCancel() {
    this.setState({ showBatchModal: false });
  }
  render() {
    const { viewHeight, record } = this.props,
      { showBatchModal, batch, data } = this.state;

    return [
      // <Switch checkedChildren="拌台" unCheckedChildren="任务" defaultChecked />,
      <div
        id={"gantt-container"}
        style={{ width: "100%", height: viewHeight - 400 }}
      />,
      <WrappedChangeBatchForm
        showBatchModal={showBatchModal}
        batch={batch || {}}
        data={data || []}
        getDatas={() => this.getDatas()}
        // handleSubmit={this.handleSubmit}
        handleCancel={() => this.handleCancel()}
      />
    ];
  }
}
