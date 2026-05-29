<template>
	<!-- 首页功能栏 -->
	<div class="toolbar" v-if="active">
		<button :class="['tool-btn', { active: activeTool === 'markPoint' }]" @click="emitTool('markPoint')">
			<img class="tool-icon" :src="icons.markPoint" alt="标点" />
			<span>标点</span>
		</button>
		<button :class="['tool-btn', { active: activeTool === 'drawLine' }]" @click="emitTool('drawLine')">
			<img class="tool-icon" :src="icons.drawLine" alt="画线" />
			<span>画线</span>
		</button>
		<button :class="['tool-btn', { active: activeTool === 'drawPolygon' }]" @click="emitTool('drawPolygon')">
			<img class="tool-icon" :src="icons.drawPolygon" alt="画多边形" />
			<span>画多边形</span>
		</button>
		<button :class="['tool-btn', { active: activeTool === 'drawCircle' }]" @click="emitTool('drawCircle')">
			<img class="tool-icon" :src="icons.drawCircle" alt="画圆" />
			<span>画圆</span>
		</button>
		<button :class="['tool-btn', { active: activeTool === 'drawRect' }]" @click="emitTool('drawRect')">
			<img class="tool-icon" :src="icons.drawRect" alt="矩形" />
			<span>矩形</span>
		</button>
		<span style="border-left:1px solid #dadde0;height:24px"></span>
		<button :class="['tool-btn', { active: activeTool === 'measureDistance' }]"
			@click="emitTool('measureDistance')">
			<img class="tool-icon" :src="icons.measureDistance" alt="测距" />
			<span>测距</span>
		</button>
		<button :class="['tool-btn', { active: activeTool === 'measureArea' }]" @click="emitTool('measureArea')">
			<img class="tool-icon" :src="icons.measureArea" alt="测面积" />
			<span>测面积</span>
		</button>
		<button :class="['tool-btn', { active: activeTool === 'measureVolume' }]"
			@click="emitTool('measureVolume')">
			<img class="tool-icon" :src="icons.measureVolume" alt="测方量" />
			<span>测方量</span>
		</button>
		<button :class="['tool-btn', { active: activeTool === 'measureAzimuth' }]"
			@click="emitTool('measureAzimuth')">
			<img class="tool-icon" :src="icons.measureAzimuth" alt="测方位角" />
			<span>测方位角</span>
		</button>
		<button :class="['tool-btn', { active: activeTool === 'measureAngle' }]" @click="emitTool('measureAngle')">
			<img class="tool-icon" :src="icons.measureAngle" alt="测夹角" />
			<span>测夹角</span>
		</button>

		<span style="border-left:1px solid #dadde0;height:24px"></span>
		<button :class="['tool-btn', 'terrain-btn', { active: terrainActive }]" @click="onTerrainButtonClick">
			<img class="tool-icon" :src="icons.dixing" alt="添加地形" />
			<span>{{ terrainActive ? '关闭地形' : '添加地形' }}</span>
		</button>
		<button :class="['tool-btn', 'terrain-btn']" @click="openShpUploadDialog">
			<img class="tool-icon" :src="icons.shp" alt="SHP上传" />
			<span>SHP上传</span>
		</button>
		<button :class="['tool-btn', 'terrain-btn']" @click="openKmlUploadDialog">
			<img class="tool-icon" :src="icons.kml" alt="KML/KMZ" />
			<span>KML/KMZ</span>
		</button>
		<button :class="['tool-btn', 'terrain-btn']" @click="openCadUploadDialog">
			<img class="tool-icon" :src="icons.cad" alt="CAD" />
			<span>CAD</span>
		</button>

		<span style="border-left:1px solid #dadde0;height:24px"></span>
		<button class="tool-btn" @click="$emit('clear-all')">
			<img class="tool-icon" :src="icons.clear" alt="清除" />
			<span>清除所有</span>
		</button>
	</div>

	<div v-if="active && terrainPanelVisible" class="terrain-panel">
		<div class="terrain-panel-header">
			<span>添加地形</span>
			<button class="close-btn" @click="$emit('cancel-terrain')">×</button>
		</div>
		<div class="terrain-panel-body">
			<input
				class="terrain-name-input"
				:value="terrainName"
				@input="$emit('update:terrainName', $event.target.value)"
				placeholder="请输入地形名称，多个名称请用分号分隔；留空自动命名"
			/>
			<div class="terrain-tip">可自定义地形名称；多个模型名称请与地址顺序对应，使用分号分隔；留空将自动命名</div>
			<textarea
				class="terrain-textarea"
				:value="terrainUrl"
				@input="$emit('update:terrainUrl', $event.target.value)"
				placeholder="请输入一个或多个 tileset.json 地址，多个地址请用分号分隔且不要重复；留空则仅加载网络地形"
			></textarea>
			<div class="terrain-tip">请输入一个或多个 tileset.json 地址，多个地址请用分号分隔且不要重复；留空则仅加载网络地形</div>
		</div>
		<div class="terrain-panel-footer">
			<button class="ghost" @click="$emit('cancel-terrain')">取消</button>
			<button class="primary" @click="$emit('confirm-terrain')">确定</button>
		</div>
	</div>

	<el-dialog
		v-model="shpUploadDialogVisible"
		title="SHP上传"
		width="520px"
		append-to-body
		class="shp-upload-dialog"
	>
		<el-upload
			v-if="!parsedShpGeojson"
			class="upload-demo"
			drag
			action="#"
			accept=".zip"
			:before-upload="beforeZipUpload"
			:file-list="uploadFileList"
			:limit="1"
			:http-request="handleLocalZipParse"
			:on-exceed="handleUploadExceed"
			:on-progress="handleUploadProgress"
			:on-success="handleUploadSuccess"
			:on-error="handleUploadError"
			:on-remove="handleUploadRemove"
		>
			<el-icon class="el-icon--upload"><UploadFilled /></el-icon>
			<div class="el-upload__text">
				将 '.zip' 文件拖到此处，或 <em>点击上传</em>
			</div>
			<template #tip>
				<div class="el-upload__tip">
					仅支持上传包含 shapefile 数据的 `.zip` 文件，解析结果会输出到浏览器控制台
				</div>
			</template>
		</el-upload>
		<div v-else class="shp-name-panel">
			<label class="shp-name-label">对象名称</label>
			<input
				v-model="parsedShpName"
				class="shp-name-input"
				type="text"
				maxlength="100"
				placeholder="请输入地图对象名称"
			/>
			<div class="shp-name-tip">默认使用压缩包原始名称，可手动修改后再确认添加到地图。</div>
		</div>
		<div v-if="uploadFileList.length" class="upload-status">
			<div class="upload-status-head">
				<span class="upload-file-name">{{ uploadFileList[0]?.name }}</span>
				<span class="upload-percent">{{ uploadPercentage }}%</span>
			</div>
			<el-progress :percentage="uploadPercentage" :status="uploadProgressStatus" />
			<div class="upload-status-tip">{{ uploadStatusText }}</div>
		</div>
		<div v-if="parsedShpGeojson" class="shp-dialog-footer">
			<button type="button" class="ghost" @click="cancelParsedShp">取消</button>
			<button type="button" class="primary" @click="confirmParsedShp">确认</button>
		</div>
	</el-dialog>

	<el-dialog
		v-model="cadUploadDialogVisible"
		title="CAD文件处理"
		width="760px"
		append-to-body
		class="shp-upload-dialog"
	>
		<el-upload
			v-if="!parsedCadData"
			class="upload-demo"
			drag
			action="#"
			accept=".dxf"
			:before-upload="beforeCadUpload"
			:file-list="cadFileList"
			:limit="1"
			:http-request="handleLocalCadParse"
			:on-exceed="handleCadUploadExceed"
			:on-progress="handleCadUploadProgress"
			:on-success="handleCadUploadSuccess"
			:on-error="handleCadUploadError"
			:on-remove="handleCadUploadRemove"
		>
			<el-icon class="el-icon--upload"><UploadFilled /></el-icon>
			<div class="el-upload__text">
				将 '.dxf' 文件拖到此处，或 <em>点击上传</em>
			</div>
			<template #tip>
				<div class="el-upload__tip">
					仅支持上传 `.dxf` 文件，且文件大小不能超过 20MB
				</div>
			</template>
		</el-upload>
		<div v-else class="shp-name-panel cad-form-panel">
			<label class="shp-name-label">对象名称</label>
			<input
				v-model="parsedCadName"
				class="shp-name-input"
				type="text"
				maxlength="100"
				placeholder="请输入地图对象名称"
			/>
			<div class="shp-name-tip">默认使用文件名，可手动修改后再确认添加到地图。</div>
			<div class="cad-spatial-card">
				<div class="cad-spatial-section">
					<div class="cad-spatial-title">坐标系信息</div>
					<div class="cad-form-row">
						<div class="cad-form-label">投影类型</div>
						<div class="cad-form-field cad-radio-group">
							<label class="cad-radio-option">
								<input
									type="radio"
									name="cadProjectionType"
									value="gauss-kruger"
									v-model="cadSpatialForm.projectionType"
								/>
								<span>高斯克吕格 (Gauss-Kruger)</span>
							</label>
							<label class="cad-radio-option">
								<input
									type="radio"
									name="cadProjectionType"
									value="utm"
									v-model="cadSpatialForm.projectionType"
								/>
								<span>UTM</span>
							</label>
						</div>
					</div>
					<div class="cad-form-row">
						<div class="cad-form-label">椭球参数</div>
						<div class="cad-form-field">
							<select v-model="cadSpatialForm.ellipsoid" class="cad-select">
								<option value="CGCS2000">国家2000</option>
								<option value="WGS84">WGS84</option>
								<option value="XIAN80">西安80</option>
								<option value="BEIJING54">北京54</option>
							</select>
						</div>
					</div>
					<div class="cad-form-row">
						<div class="cad-form-label">坐标系</div>
						<div class="cad-form-field">
							<select v-model="cadSpatialForm.coordinateSystem" class="cad-select" @change="applyCadCoordinateSystemPreset">
								<option
									v-for="option in cadCoordinateSystemOptions"
									:key="option.value"
									:value="option.value"
								>
									{{ option.label }}
								</option>
							</select>
						</div>
					</div>
					<div class="cad-form-row cad-form-row-top">
						<div class="cad-form-label">中央子午线</div>
						<div class="cad-form-field">
							<div class="cad-inline-grid cad-inline-grid-wide">
								<input v-model.number="cadSpatialForm.centralMeridianDeg" type="number" class="cad-number-input" step="1" />
								<span class="cad-unit-text">度</span>
								<input v-model.number="cadSpatialForm.centralMeridianMin" type="number" class="cad-number-input" step="1" min="0" max="59" />
								<span class="cad-unit-text">分</span>
								<input v-model.number="cadSpatialForm.centralMeridianSec" type="number" class="cad-number-input" step="0.01" min="0" max="59.99" />
								<span class="cad-unit-text">秒</span>
							</div>
						</div>
					</div>
					<div class="cad-form-row cad-form-row-wrap">
						<div class="cad-form-group-inline">
							<div class="cad-form-label">投影面高程</div>
							<div class="cad-form-field">
								<div class="cad-inline-grid">
									<input v-model.number="cadSpatialForm.elevation" type="number" class="cad-number-input" step="0.01" />
									<span class="cad-unit-text">米</span>
								</div>
							</div>
						</div>
						<div class="cad-form-group-inline">
							<div class="cad-form-label">假东</div>
							<div class="cad-form-field">
								<div class="cad-inline-grid">
									<input v-model.number="cadSpatialForm.falseEasting" type="number" class="cad-number-input" step="0.01" />
									<span class="cad-unit-text">米</span>
								</div>
							</div>
						</div>
						<div class="cad-form-group-inline">
							<div class="cad-form-label">假北</div>
							<div class="cad-form-field">
								<div class="cad-inline-grid">
									<input v-model.number="cadSpatialForm.falseNorthing" type="number" class="cad-number-input" step="0.01" />
									<span class="cad-unit-text">米</span>
								</div>
							</div>
						</div>
					</div>
				</div>
				<div class="cad-spatial-section">
					<div class="cad-spatial-title">转换参数信息</div>
					<div class="cad-form-row">
						<div class="cad-form-label">转换参数</div>
						<div class="cad-form-field cad-checkbox-group">
							<label class="cad-checkbox-option">
								<input type="checkbox" v-model="cadSpatialForm.transformEnabled" />
								<span>启用</span>
							</label>
						</div>
					</div>
					<div class="cad-form-row">
						<div class="cad-form-label">参数类型</div>
						<div class="cad-form-field cad-radio-group">
							<label class="cad-radio-option">
								<input
									type="radio"
									name="cadParamType"
									value="four"
									v-model="cadSpatialForm.parameterType"
									:disabled="!cadSpatialForm.transformEnabled"
								/>
								<span>四参数</span>
							</label>
							<label class="cad-radio-option disabled">
								<input
									type="radio"
									name="cadParamType"
									value="seven"
									v-model="cadSpatialForm.parameterType"
									disabled
								/>
								<span>七参数</span>
							</label>
						</div>
					</div>
					<div class="cad-form-row cad-form-row-wrap">
						<div class="cad-form-group-half">
							<div class="cad-form-label">X平移</div>
							<div class="cad-form-field">
								<div class="cad-inline-grid">
									<input
										v-model.number="cadSpatialForm.xTranslate"
										type="number"
										class="cad-number-input"
										step="0.001"
										:disabled="!cadSpatialForm.transformEnabled"
									/>
									<span class="cad-unit-text">m(米)</span>
								</div>
							</div>
						</div>
						<div class="cad-form-group-half">
							<div class="cad-form-label">Y平移</div>
							<div class="cad-form-field">
								<div class="cad-inline-grid">
									<input
										v-model.number="cadSpatialForm.yTranslate"
										type="number"
										class="cad-number-input"
										step="0.001"
										:disabled="!cadSpatialForm.transformEnabled"
									/>
									<span class="cad-unit-text">m(米)</span>
								</div>
							</div>
						</div>
					</div>
					<div class="cad-form-row cad-form-row-wrap">
						<div class="cad-form-group-half">
							<div class="cad-form-label">旋转</div>
							<div class="cad-form-field">
								<div class="cad-inline-grid">
									<input
										v-model.number="cadSpatialForm.rotation"
										type="number"
										class="cad-number-input"
										step="0.000001"
										:disabled="!cadSpatialForm.transformEnabled"
									/>
									<span class="cad-unit-text">rad(弧度)</span>
								</div>
							</div>
						</div>
						<div class="cad-form-group-half">
							<div class="cad-form-label">缩放</div>
							<div class="cad-form-field">
								<input
									v-model.number="cadSpatialForm.scale"
									type="number"
									class="cad-number-input"
									step="0.000001"
									:disabled="!cadSpatialForm.transformEnabled"
								/>
							</div>
						</div>
					</div>
					<div class="shp-name-tip">缩放填写为相对比例增量，`0` 表示不缩放，`0.000001` 表示 1 ppm。</div>
				</div>
			</div>
		</div>
		<div v-if="cadFileList.length" class="upload-status">
			<div class="upload-status-head">
				<span class="upload-file-name">{{ cadFileList[0]?.name }}</span>
				<span class="upload-percent">{{ cadUploadPercentage }}%</span>
			</div>
			<el-progress :percentage="cadUploadPercentage" :status="cadUploadProgressStatus" />
			<div class="upload-status-tip">{{ cadUploadStatusText }}</div>
		</div>
		<div v-if="parsedCadData" class="shp-dialog-footer">
			<button type="button" class="ghost" @click="cancelParsedCad">取消</button>
			<button type="button" class="primary" @click="confirmParsedCad">确认</button>
		</div>
	</el-dialog>

	<el-dialog
		v-model="kmlUploadDialogVisible"
		title="KML/KMZ上传"
		width="520px"
		append-to-body
		class="shp-upload-dialog"
	>
		<el-upload
			v-if="!parsedKmlFile"
			class="upload-demo"
			drag
			action="#"
			accept=".kml,.kmz"
			:before-upload="beforeKmlUpload"
			:file-list="kmlFileList"
			:limit="1"
			:http-request="handleLocalKmlParse"
			:on-exceed="handleKmlUploadExceed"
			:on-progress="handleKmlUploadProgress"
			:on-success="handleKmlUploadSuccess"
			:on-error="handleKmlUploadError"
			:on-remove="handleKmlUploadRemove"
		>
			<el-icon class="el-icon--upload"><UploadFilled /></el-icon>
			<div class="el-upload__text">
				将 '.kml' 或 '.kmz' 文件拖到此处，或 <em>点击上传</em>
			</div>
			<template #tip>
				<div class="el-upload__tip">
					仅支持上传 `.kml` / `.kmz` 文件
				</div>
			</template>
		</el-upload>
		<div v-else class="shp-name-panel">
			<label class="shp-name-label">对象名称</label>
			<input
				v-model="parsedKmlName"
				class="shp-name-input"
				type="text"
				maxlength="100"
				placeholder="请输入地图对象名称"
			/>
			<div class="shp-name-tip">默认使用文件名，可手动修改后再确认添加到地图。</div>
		</div>
		<div v-if="kmlFileList.length" class="upload-status">
			<div class="upload-status-head">
				<span class="upload-file-name">{{ kmlFileList[0]?.name }}</span>
				<span class="upload-percent">{{ kmlUploadPercentage }}%</span>
			</div>
			<el-progress :percentage="kmlUploadPercentage" :status="kmlUploadProgressStatus" />
			<div class="upload-status-tip">{{ kmlUploadStatusText }}</div>
		</div>
		<div v-if="parsedKmlFile" class="shp-dialog-footer">
			<button type="button" class="ghost" @click="cancelParsedKml">取消</button>
			<button type="button" class="primary" @click="confirmParsedKml">确认</button>
		</div>
	</el-dialog>

	<!-- 测绘信息面板 -->
	<div v-if="measurePanelVisible && active" class="measure-panel">
		<div class="measure-header">
			<div class="tabs">
				<span class="tab" :class="{ active: measureActiveTab === 'info' }"
					@click="$emit('update:measureActiveTab', 'info')">信息</span>
				<span v-if="!isMarkPoint" class="tab" :class="{ active: measureActiveTab === 'data' }"
					@click="$emit('update:measureActiveTab', 'data')">数据</span>
			</div>
			<button class="close-btn" @click="$emit('update:measurePanelVisible', false)">×</button>
		</div>
		<div class="measure-body">
			<template v-if="isMarkPoint || measureActiveTab === 'info'">
				<template v-if="isMarkPoint">
					<input class="input" v-model="measureForm.name" placeholder="点击输入名称" />
					<div class="result-box">
						<div class="result-line">
							<span class="badge">经度</span>
							<div class="value">{{ formattedLongitude }}</div>
						</div>
						<div class="result-line">
							<span class="badge" style="background:#20b36e">纬度</span>
							<div class="value">{{ formattedLatitude }}</div>
						</div>
					</div>
					<div class="data-toolbar">
						<button class="copy-btn" @click="$emit('copy-coords')">一键复制</button>
					</div>
					<textarea class="textarea" v-model="measureForm.desc" placeholder="请输入描述"></textarea>
				</template>
				<template v-else>
					<input class="input" v-model="measureForm.name" placeholder="点击输入名称" />
					<div class="result-box">
						<div class="result-line">
							<span class="badge">长度</span>
							<div class="value">{{ formattedLength }}</div>
							<div class="unit">{{ unitLabel }}</div>
							<span class="divider" v-if="hasArea"></span>
							<template v-if="hasArea">
								<span class="badge" style="background:#20b36e">面积</span>
								<div class="value">{{ formattedArea }}</div>
								<div class="unit">{{ areaUnitLabel }}</div>
							</template>
						</div>
					</div>
					<div class="row" v-if="hasArea">
						<label>高度</label>
						<input type="number" class="input" v-model.number="measureForm.heightMeters" min="0" step="0.1"
							placeholder="请输入高度（米）" />
					</div>
					<div class="result-box" v-if="hasVolume">
						<div class="result-line">
							<span class="badge" style="background:#409eff">方量</span>
							<div class="value">{{ formattedVolume }}</div>
							<div class="unit">{{ volumeUnitLabel }}</div>
						</div>
					</div>
					<div class="row">
						<label>长度单位</label>
						<select v-model="measureForm.unit" class="select">
							<option value="auto">跟随地图设置(千米,米)</option>
							<option value="m">米</option>
							<option value="km">千米</option>
						</select>
					</div>
					<textarea class="textarea" v-model="measureForm.desc" placeholder="请输入描述"></textarea>
				</template>
			</template>

			<template v-else>
				<div class="data-toolbar">
					<button class="copy-btn" @click="$emit('copy-all')">一键复制</button>
					<button class="copy-btn" @click="$emit('copy-coords')">仅复制坐标</button>
				</div>
				<div class="data-scroll">
					<table class="data-table">
						<thead>
							<tr>
								<th class="data-index"></th>
								<th class="data-th">经度</th>
								<th class="data-th">纬度</th>
								<th class="data-th">线段距离</th>
								<th class="data-th">累计距离</th>
							</tr>
						</thead>
						<tbody>
							<tr v-for="(p, i) in lastMeasure.points" :key="i">
								<td class="data-index">{{ i }}</td>
								<td class="data-td">
									<div class="data-cell">{{ Number(p.lon).toFixed(12) }}</div>
								</td>
								<td class="data-td">
									<div class="data-cell">{{ Number(p.lat).toFixed(12) }}</div>
								</td>
								<td class="data-td">
									<div class="data-cell">{{ i === 0 ? '-' : formatMeters(lastMeasure.segmentsMeters[i]) }}</div>
								</td>
								<td class="data-td">
									<div class="data-cell">{{ formatMeters(lastMeasure.cumulativeMeters[i]) }}</div>
								</td>
							</tr>
						</tbody>
					</table>
				</div>
			</template>
		</div>
		<div class="measure-footer">
			<button class="ghost" @click="$emit('delete-current')">删除</button>
		</div>
	</div>

	<div v-if="active" :class="['info_list_shell', { collapsed: isInfoListCollapsed }]">
		<div class="info_list">
			<div class="info_list_header">
				<span>地图对象</span>
				<span class="info_list_count">{{ syInfoItems.length }}</span>
			</div>
			<div class="info_list_body">
				<div v-if="!syInfoItems.length" class="info_list_empty">暂无已添加对象</div>
				<div
					v-for="item in syInfoItems"
					:key="item.key"
					:class="['info_item', { active: item.selected, hidden: !item.checked }]"
					@click="emit('select-sy-info-item', item)"
				>
					<input
						class="info_item_checkbox"
						type="checkbox"
						:checked="item.checked"
						@click.stop
						@change="emit('toggle-sy-info-item', { item, checked: $event.target.checked })"
					/>
					<div class="info_item_main">
						<div class="info_item_top">
							<span class="info_item_name">{{ item.name }}</span>
							<div class="info_item_actions">
								<span class="info_item_tag">{{ item.typeLabel }}</span>
								<button
									type="button"
									class="info_item_delete"
									@click.stop="emit('delete-sy-info-item', item)"
									:aria-label="`删除${item.name}`"
								>
									<img :src="deleteIcon" alt="删除" class="info_item_delete_icon" />
								</button>
							</div>
						</div>
						<div v-if="item.subtitle" class="info_item_subtitle">{{ item.subtitle }}</div>
					</div>
				</div>
			</div>
		</div>
		<button
			type="button"
			class="info_bookmark_btn"
			:class="{ collapsed: isInfoListCollapsed }"
			@click="toggleInfoList"
			:aria-label="isInfoListCollapsed ? '展开地图对象列表' : '隐藏地图对象列表'"
		>
			<img :src="bookmarkIcon" alt="书签" class="info_bookmark_icon" />
			<span v-if="isInfoListCollapsed" class="info_bookmark_count">{{ syInfoItems.length }}</span>
		</button>
	</div>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { UploadFilled } from '@element-plus/icons-vue';
import { DxfParser } from 'dxf-parser';
import { iter } from 'but-unzip';
import shp from 'shpjs';

const props = defineProps({
	active: Boolean,
	activeTool: String,
	icons: Object,
	measurePanelVisible: Boolean,
	measureActiveTab: String,
	measureForm: Object,
	lastMeasure: Object,
	terrainActive: Boolean,
	terrainPanelVisible: Boolean,
	terrainUrl: String,
	terrainName: String,
	syInfoItems: {
		type: Array,
		default: () => [],
	},
});

const emit = defineEmits(['start-tool', 'clear-all', 'update:measurePanelVisible', 'update:measureActiveTab', 'copy-all', 'copy-coords', 'delete-current', 'open-terrain-panel', 'close-terrain', 'confirm-terrain', 'cancel-terrain', 'update:terrainUrl', 'update:terrainName', 'toggle-sy-info-item', 'select-sy-info-item', 'delete-sy-info-item', 'confirm-shp-import', 'confirm-kml-import', 'confirm-cad-import']);
const bookmarkIcon = new URL('../../assets/左边.png', import.meta.url).href;
const deleteIcon = new URL('../../assets/删除.png', import.meta.url).href;
const isInfoListCollapsed = ref(true);
const shpUploadDialogVisible = ref(false);
const kmlUploadDialogVisible = ref(false);
const cadUploadDialogVisible = ref(false);
const uploadFileList = ref([]);
const uploadPercentage = ref(0);
const uploadProgressStatus = ref('');
const uploadStatusText = ref('等待上传');
const uploadParsing = ref(false);
const parsedShpGeojson = ref(null);
const parsedShpName = ref('');
const parsedShpSourceFileName = ref('');
const kmlFileList = ref([]);
const kmlUploadPercentage = ref(0);
const kmlUploadProgressStatus = ref('');
const kmlUploadStatusText = ref('等待上传');
const kmlUploadParsing = ref(false);
const parsedKmlFile = ref(null);
const parsedKmlName = ref('');
const parsedKmlSourceFileName = ref('');
const cadFileList = ref([]);
const cadUploadPercentage = ref(0);
const cadUploadProgressStatus = ref('');
const cadUploadStatusText = ref('等待上传');
const cadUploadParsing = ref(false);
const parsedCadData = ref(null);
const parsedCadName = ref('');
const parsedCadSourceFileName = ref('');
const CAD_COORDINATE_SYSTEM_PRESETS = {
	'gauss-kruger': [
		{ value: 'cgcs2000-gk-3-114', label: '国家2000 高斯三度分带 中央经线114（坐标不含分带）', centralMeridian: 114, falseEasting: 500000, falseNorthing: 0, scaleFactor: 1, zoneWidth: 3 },
		{ value: 'cgcs2000-gk-3-117', label: '国家2000 高斯三度分带 中央经线117（坐标不含分带）', centralMeridian: 117, falseEasting: 500000, falseNorthing: 0, scaleFactor: 1, zoneWidth: 3 },
		{ value: 'cgcs2000-gk-3-120', label: '国家2000 高斯三度分带 中央经线120（坐标不含分带）', centralMeridian: 120, falseEasting: 500000, falseNorthing: 0, scaleFactor: 1, zoneWidth: 3 },
		{ value: 'cgcs2000-gk-3-123', label: '国家2000 高斯三度分带 中央经线123（坐标不含分带）', centralMeridian: 123, falseEasting: 500000, falseNorthing: 0, scaleFactor: 1, zoneWidth: 3 },
		{ value: 'cgcs2000-gk-3-126', label: '国家2000 高斯三度分带 中央经线126（坐标不含分带）', centralMeridian: 126, falseEasting: 500000, falseNorthing: 0, scaleFactor: 1, zoneWidth: 3 },
		{ value: 'cgcs2000-gk-6-123', label: '国家2000 高斯六度分带 中央经线123（坐标不含分带）', centralMeridian: 123, falseEasting: 500000, falseNorthing: 0, scaleFactor: 1, zoneWidth: 6 },
	],
	utm: [
		{ value: 'cgcs2000-utm-49n', label: '国家2000 UTM 49N', centralMeridian: 111, falseEasting: 500000, falseNorthing: 0, scaleFactor: 0.9996, zoneWidth: 6, zone: 49, hemisphere: 'north' },
		{ value: 'cgcs2000-utm-50n', label: '国家2000 UTM 50N', centralMeridian: 117, falseEasting: 500000, falseNorthing: 0, scaleFactor: 0.9996, zoneWidth: 6, zone: 50, hemisphere: 'north' },
		{ value: 'cgcs2000-utm-51n', label: '国家2000 UTM 51N', centralMeridian: 123, falseEasting: 500000, falseNorthing: 0, scaleFactor: 0.9996, zoneWidth: 6, zone: 51, hemisphere: 'north' },
		{ value: 'cgcs2000-utm-52n', label: '国家2000 UTM 52N', centralMeridian: 129, falseEasting: 500000, falseNorthing: 0, scaleFactor: 0.9996, zoneWidth: 6, zone: 52, hemisphere: 'north' },
	],
};
const getDefaultCadSpatialForm = () => ({
	projectionType: 'gauss-kruger',
	ellipsoid: 'CGCS2000',
	coordinateSystem: 'cgcs2000-gk-3-120',
	centralMeridianDeg: 120,
	centralMeridianMin: 0,
	centralMeridianSec: 0,
	elevation: 0,
	falseEasting: 500000,
	falseNorthing: 0,
	transformEnabled: false,
	parameterType: 'four',
	xTranslate: 0,
	yTranslate: 0,
	rotation: 0,
	scale: 0,
});
const cadSpatialForm = reactive(getDefaultCadSpatialForm());
const CAD_MAX_SIZE = 20 * 1024 * 1024;
const dxfParser = new DxfParser();
const cadCoordinateSystemOptions = computed(() => CAD_COORDINATE_SYSTEM_PRESETS[cadSpatialForm.projectionType] || []);

const formattedLength = computed(() => {
	const m = props.measureForm.lengthMeters;
	const useKm = props.measureForm.unit === 'km' || (props.measureForm.unit === 'auto' && m >= 1000);
	return useKm ? (m / 1000).toFixed(2) : m.toFixed(2);
});

const isMarkPoint = computed(() => props.measureForm?.kind === 'markPoint');

const formattedLongitude = computed(() => {
	const lon = props.measureForm?.longitude;
	if (lon == null || lon === '') return '-';
	const n = Number(lon);
	return Number.isFinite(n) ? n.toFixed(12) : '-';
});

const formattedLatitude = computed(() => {
	const lat = props.measureForm?.latitude;
	if (lat == null || lat === '') return '-';
	const n = Number(lat);
	return Number.isFinite(n) ? n.toFixed(12) : '-';
});

const unitLabel = computed(() => {
	const m = props.measureForm.lengthMeters;
	const useKm = props.measureForm.unit === 'km' || (props.measureForm.unit === 'auto' && m >= 1000);
	return useKm ? '千米' : '米';
});

const formattedArea = computed(() => {
	const a = props.measureForm.areaSqMeters;
	if (!a || a < 0) return '0.00';
	return a >= 1e6 ? (a / 1e6).toFixed(2) : a.toFixed(2);
});

const areaUnitLabel = computed(() => {
	const a = props.measureForm.areaSqMeters;
	return a >= 1e6 ? '平方千米' : '平方米';
});

const hasArea = computed(() => {
	// 如果是距离测量或方位角/夹角测量，强制不显示面积
	if (['distance', 'azimuth', 'angle'].includes(props.measureForm.kind)) return false;
	return props.measureForm.areaSqMeters > 0;
});

const formattedVolume = computed(() => {
	const v = props.measureForm.volumeCubicMeters;
	if (!v || v < 0) return '0.00';
	return v >= 1e9 ? (v / 1e9).toFixed(2) : v.toFixed(2);
});

const volumeUnitLabel = computed(() => {
	return (props.measureForm.volumeCubicMeters >= 1e9) ? '立方千米' : '立方米';
});

const hasVolume = computed(() => props.measureForm.areaSqMeters > 0 && props.measureForm.heightMeters > 0);

const formatMeters = (m) => {
	const useKm = props.measureForm.unit === 'km' || (props.measureForm.unit === 'auto' && m >= 1000);
	return useKm ? (m / 1000).toFixed(2) : m.toFixed(2);
}

const emitTool = (type) => {
	emit('start-tool', type);
};

const onTerrainButtonClick = () => {
	if (props.terrainActive) {
		emit('close-terrain');
		return;
	}
	emit('open-terrain-panel');
};

const openShpUploadDialog = () => {
	shpUploadDialogVisible.value = true;
};

const openKmlUploadDialog = () => {
	kmlUploadDialogVisible.value = true;
};

const openCadUploadDialog = () => {
	cadUploadDialogVisible.value = true;
};

const resetCadSpatialForm = () => {
	Object.assign(cadSpatialForm, getDefaultCadSpatialForm());
};

const resetShpUploadState = () => {
	uploadFileList.value = [];
	uploadPercentage.value = 0;
	uploadProgressStatus.value = '';
	uploadStatusText.value = '等待上传';
	uploadParsing.value = false;
	parsedShpGeojson.value = null;
	parsedShpName.value = '';
	parsedShpSourceFileName.value = '';
};

const resetKmlUploadState = () => {
	kmlFileList.value = [];
	kmlUploadPercentage.value = 0;
	kmlUploadProgressStatus.value = '';
	kmlUploadStatusText.value = '等待上传';
	kmlUploadParsing.value = false;
	parsedKmlFile.value = null;
	parsedKmlName.value = '';
	parsedKmlSourceFileName.value = '';
};

const resetCadUploadState = () => {
	cadFileList.value = [];
	cadUploadPercentage.value = 0;
	cadUploadProgressStatus.value = '';
	cadUploadStatusText.value = '等待上传';
	cadUploadParsing.value = false;
	parsedCadData.value = null;
	parsedCadName.value = '';
	parsedCadSourceFileName.value = '';
	resetCadSpatialForm();
};

const getDefaultParsedShpName = (fileName) => {
	const baseName = String(fileName || '').trim().replace(/\.zip$/i, '');
	return baseName || '本地shapefile';
};

const getDefaultParsedKmlName = (fileName) => {
	const baseName = String(fileName || '').trim().replace(/\.(kml|kmz)$/i, '');
	return baseName || '本地KML';
};

const getDefaultParsedCadName = (fileName) => {
	const baseName = String(fileName || '').trim().replace(/\.dxf$/i, '');
	return baseName || '本地CAD';
};

const getCadCoordinateSystemPreset = (value = cadSpatialForm.coordinateSystem) => {
	return cadCoordinateSystemOptions.value.find((option) => option.value === value) || null;
};

const setCadCentralMeridianByDecimal = (value) => {
	const total = Math.abs(Number(value) || 0);
	const deg = Math.trunc(total);
	const minutesFloat = (total - deg) * 60;
	const min = Math.trunc(minutesFloat);
	const sec = Number((((minutesFloat - min) * 60) || 0).toFixed(2));
	cadSpatialForm.centralMeridianDeg = value < 0 ? -deg : deg;
	cadSpatialForm.centralMeridianMin = min;
	cadSpatialForm.centralMeridianSec = sec;
};

const applyCadCoordinateSystemPreset = () => {
	const preset = getCadCoordinateSystemPreset();
	if (!preset) return;
	setCadCentralMeridianByDecimal(preset.centralMeridian);
	cadSpatialForm.falseEasting = preset.falseEasting;
	cadSpatialForm.falseNorthing = preset.falseNorthing;
};

const getCadCentralMeridianDecimal = () => {
	const deg = Number(cadSpatialForm.centralMeridianDeg || 0);
	const min = Number(cadSpatialForm.centralMeridianMin || 0);
	const sec = Number(cadSpatialForm.centralMeridianSec || 0);
	const sign = deg < 0 ? -1 : 1;
	const absDeg = Math.abs(deg);
	return sign * (absDeg + min / 60 + sec / 3600);
};

const buildCadSpatialReferencePayload = () => {
	const preset = getCadCoordinateSystemPreset();
	return {
		projectionType: cadSpatialForm.projectionType,
		ellipsoid: cadSpatialForm.ellipsoid,
		coordinateSystem: cadSpatialForm.coordinateSystem,
		coordinateSystemLabel: preset?.label || '',
		centralMeridian: getCadCentralMeridianDecimal(),
		centralMeridianDms: {
			deg: Number(cadSpatialForm.centralMeridianDeg || 0),
			min: Number(cadSpatialForm.centralMeridianMin || 0),
			sec: Number(cadSpatialForm.centralMeridianSec || 0),
		},
		elevation: Number(cadSpatialForm.elevation || 0),
		falseEasting: Number(cadSpatialForm.falseEasting || 0),
		falseNorthing: Number(cadSpatialForm.falseNorthing || 0),
		scaleFactor: Number(preset?.scaleFactor ?? (cadSpatialForm.projectionType === 'utm' ? 0.9996 : 1)),
		zoneWidth: Number(preset?.zoneWidth || (cadSpatialForm.projectionType === 'utm' ? 6 : 3)),
		zone: Number(preset?.zone || 0),
		hemisphere: preset?.hemisphere || 'north',
		transformation: {
			enabled: cadSpatialForm.transformEnabled,
			parameterType: cadSpatialForm.parameterType,
			xTranslate: Number(cadSpatialForm.xTranslate || 0),
			yTranslate: Number(cadSpatialForm.yTranslate || 0),
			rotation: Number(cadSpatialForm.rotation || 0),
			scale: Number(cadSpatialForm.scale || 0),
		},
	};
};

const validateCadSpatialForm = () => {
	if (!String(parsedCadName.value || '').trim()) {
		ElMessage.warning('请输入 CAD 对象名称');
		return false;
	}
	const centralMeridian = getCadCentralMeridianDecimal();
	if (!Number.isFinite(centralMeridian) || Math.abs(centralMeridian) > 180) {
		ElMessage.error('中央子午线输入无效，请检查度分秒');
		return false;
	}
	const min = Number(cadSpatialForm.centralMeridianMin || 0);
	const sec = Number(cadSpatialForm.centralMeridianSec || 0);
	if (min < 0 || min >= 60 || sec < 0 || sec >= 60) {
		ElMessage.error('中央子午线的分秒范围应在 0 到 60 之间');
		return false;
	}
	if (!Number.isFinite(Number(cadSpatialForm.falseEasting)) || !Number.isFinite(Number(cadSpatialForm.falseNorthing))) {
		ElMessage.error('请填写有效的假东、假北参数');
		return false;
	}
	if (!Number.isFinite(Number(cadSpatialForm.elevation))) {
		ElMessage.error('请填写有效的投影面高程');
		return false;
	}
	if (cadSpatialForm.transformEnabled) {
		if (!Number.isFinite(Number(cadSpatialForm.xTranslate)) ||
			!Number.isFinite(Number(cadSpatialForm.yTranslate)) ||
			!Number.isFinite(Number(cadSpatialForm.rotation)) ||
			!Number.isFinite(Number(cadSpatialForm.scale))) {
			ElMessage.error('请填写完整且有效的转换参数');
			return false;
		}
	}
	return true;
};

const ZIP_ENTRY_REGEX = /\.(shp|dbf|prj|cpg)$/i;
const textDecoder = new TextDecoder();

const toDataView = (raw) => {
	if (!raw) return undefined;
	return new DataView(raw.buffer, raw.byteOffset, raw.byteLength);
};

const normalizeZipEntryName = (name) => String(name || '').replace(/\\/g, '/').trim();

const getZipEntryBaseName = (name) => {
	const normalized = normalizeZipEntryName(name);
	const dotIndex = normalized.lastIndexOf('.');
	return dotIndex >= 0 ? normalized.slice(0, dotIndex) : normalized;
};

const sanitizeCpgValue = (value) => String(value || '').replace(/\u0000/g, '').trim();

const hasReplacementChar = (value) => typeof value === 'string' && value.includes('\uFFFD');

const collectReplacementCharCount = (value) => {
	if (typeof value === 'string') {
		return (value.match(/\uFFFD/g) || []).length;
	}
	if (Array.isArray(value)) {
		return value.reduce((sum, item) => sum + collectReplacementCharCount(item), 0);
	}
	if (value && typeof value === 'object') {
		return Object.entries(value).reduce((sum, [key, item]) => sum + collectReplacementCharCount(key) + collectReplacementCharCount(item), 0);
	}
	return 0;
};

const findGarbledSamples = (value, samples = []) => {
	if (samples.length >= 5) return samples;
	if (typeof value === 'string') {
		if (hasReplacementChar(value)) samples.push(value);
		return samples;
	}
	if (Array.isArray(value)) {
		value.forEach((item) => findGarbledSamples(item, samples));
		return samples;
	}
	if (value && typeof value === 'object') {
		Object.entries(value).forEach(([key, item]) => {
			findGarbledSamples(key, samples);
			findGarbledSamples(item, samples);
		});
	}
	return samples;
};

const analyzeGeoJsonTextQuality = (geojson) => {
	const replacementCount = collectReplacementCharCount(geojson);
	return {
		replacementCount,
		garbledSamples: findGarbledSamples(geojson, []),
	};
};

const unzipShapefileEntries = async (arrayBuffer) => {
	const bytes = new Uint8Array(arrayBuffer);
	const grouped = new Map();
	for (const entry of iter(bytes)) {
		const filename = normalizeZipEntryName(entry?.filename);
		if (!ZIP_ENTRY_REGEX.test(filename)) continue;
		const ext = filename.split('.').pop().toLowerCase();
		const baseName = getZipEntryBaseName(filename);
		if (!grouped.has(baseName)) grouped.set(baseName, {});
		const target = grouped.get(baseName);
		const raw = await entry.read();
		if (ext === 'shp' || ext === 'dbf') {
			target[ext] = raw;
		} else {
			target[ext] = sanitizeCpgValue(textDecoder.decode(raw));
		}
		target.baseName = baseName;
	}
	return [...grouped.values()].filter((item) => item?.shp);
};

const buildShpParseInput = (entry, encoding) => {
	const input = {
		shp: toDataView(entry.shp),
	};
	if (entry.dbf) input.dbf = toDataView(entry.dbf);
	if (entry.prj) input.prj = entry.prj;
	if (encoding) input.cpg = encoding;
	return input;
};

const parseSingleShapefileEntry = async (entry) => {
	const detectedCpg = sanitizeCpgValue(entry.cpg);
	const fallbackEncodings = ['GBK', '936', 'GB18030', 'UTF-8'];
	const candidateEncodings = detectedCpg
		? [detectedCpg]
		: (entry.dbf ? fallbackEncodings : [undefined]);
	let bestResult = null;
	let lastError = null;

	for (const encoding of candidateEncodings) {
		try {
			const parsed = await shp(buildShpParseInput(entry, encoding));
			const quality = analyzeGeoJsonTextQuality(parsed);
			const candidate = {
				parsed,
				encoding: encoding || 'default',
				quality,
			};
			if (!bestResult || quality.replacementCount < bestResult.quality.replacementCount) {
				bestResult = candidate;
			}
			if (quality.replacementCount === 0) break;
		} catch (error) {
			lastError = error;
		}
	}

	if (bestResult) {
		return {
			...bestResult,
			detectedCpg: detectedCpg || '',
			baseName: entry.baseName || '',
		};
	}
	throw lastError || new Error('Failed to parse shapefile entry');
};

const parseLocalShapefileZip = async (arrayBuffer) => {
	const entries = await unzipShapefileEntries(arrayBuffer);
	if (!entries.length) {
		throw new Error('压缩包中未找到有效的 .shp 文件');
	}

	const parsedEntries = [];
	for (const entry of entries) {
		const parsedEntry = await parseSingleShapefileEntry(entry);
		if (parsedEntry.parsed && typeof parsedEntry.parsed === 'object') {
			parsedEntry.parsed.fileName = parsedEntry.parsed.fileName || parsedEntry.baseName;
		}
		parsedEntries.push(parsedEntry);
	}

	const totalReplacementCount = parsedEntries.reduce((sum, item) => sum + (item.quality?.replacementCount || 0), 0);
	return {
		geojson: parsedEntries.length === 1 ? parsedEntries[0].parsed : parsedEntries.map((item) => item.parsed),
		entries: parsedEntries,
		totalReplacementCount,
	};
};

const beforeZipUpload = (rawFile) => {
	const isZipFile = /\.zip$/i.test(rawFile?.name || '');
	if (!isZipFile) {
		ElMessage.error('仅支持上传 .zip 类型文件');
		return false;
	}
	parsedShpGeojson.value = null;
	parsedShpName.value = '';
	parsedShpSourceFileName.value = rawFile?.name || '';
	uploadPercentage.value = 0;
	uploadProgressStatus.value = '';
	uploadStatusText.value = '开始上传...';
	uploadParsing.value = true;
	return true;
};

const handleLocalZipParse = async (options) => {
	const file = options?.file;
	if (!file) {
		uploadParsing.value = false;
		uploadStatusText.value = '未检测到待解析文件';
		options?.onError?.(new Error('No file selected'));
		return;
	}
	try {
		options?.onProgress?.({ percent: 10 });
		uploadStatusText.value = '正在读取本地文件...';
		const arrayBuffer = await file.arrayBuffer();
		options?.onProgress?.({ percent: 45 });
		uploadStatusText.value = '正在解析 shapefile...';
		const parsedResult = await parseLocalShapefileZip(arrayBuffer);
		const geojson = parsedResult.geojson;
		options?.onProgress?.({ percent: 100 });
		parsedShpGeojson.value = geojson;
		parsedShpSourceFileName.value = file.name || '';
		parsedShpName.value = getDefaultParsedShpName(file.name);
		uploadStatusText.value = '解析完成，请确认名称后添加到地图';
		console.log('Parsed GeoJSON from local shapefile zip:', geojson);
		console.log('Shapefile encoding parse details:', parsedResult.entries.map((item) => ({
			fileName: item.baseName,
			detectedCpg: item.detectedCpg || '(missing)',
			usedEncoding: item.encoding,
			replacementCount: item.quality?.replacementCount || 0,
			garbledSamples: item.quality?.garbledSamples || [],
		})));
		options?.onSuccess?.(geojson);
		if (parsedResult.totalReplacementCount > 0) {
			ElMessage.warning(`已完成解析，但仍检测到 ${parsedResult.totalReplacementCount} 处疑似乱码，请优先检查 .cpg`);
		} else {
			ElMessage.success('shapefile 本地解析成功，已自动处理编码，请确认名称后添加到地图');
		}
	} catch (error) {
		console.error('Failed to parse local shapefile zip:', error);
		parsedShpGeojson.value = null;
		uploadStatusText.value = '解析失败，请确认 zip 中包含合法的 shapefile 文件';
		options?.onError?.(error);
		ElMessage.error('解析失败，请确认 zip 中包含合法的 shapefile 文件');
	} finally {
		uploadParsing.value = false;
	}
};

const handleUploadExceed = () => {
	ElMessage.warning('一次只能上传一个文件');
};

const handleUploadProgress = (event, uploadFile, fileList) => {
	uploadFileList.value = fileList.slice(-1);
	uploadPercentage.value = Math.min(100, Math.round(event?.percent || 0));
	uploadProgressStatus.value = '';
	uploadStatusText.value = uploadParsing.value ? '正在本地解析...' : '处理中...';
};

const handleUploadSuccess = (response, uploadFile, fileList) => {
	uploadFileList.value = fileList.slice(-1);
	uploadPercentage.value = 100;
	uploadProgressStatus.value = 'success';
	uploadStatusText.value = '解析完成，请确认名称';
};

const handleUploadError = (error, uploadFile, fileList) => {
	uploadFileList.value = fileList.slice(-1);
	uploadProgressStatus.value = 'exception';
	uploadStatusText.value = '解析失败';
	uploadParsing.value = false;
};

const handleUploadRemove = (uploadFile, fileList) => {
	uploadFileList.value = fileList.slice(-1);
	if (!uploadFileList.value.length) {
		resetShpUploadState();
	}
};

const cancelParsedShp = () => {
	resetShpUploadState();
};

const confirmParsedShp = () => {
	if (!parsedShpGeojson.value) {
		ElMessage.warning('请先完成压缩包解析');
		return;
	}
	const name = String(parsedShpName.value || '').trim() || getDefaultParsedShpName(parsedShpSourceFileName.value);
	emit('confirm-shp-import', {
		name,
		sourceFileName: parsedShpSourceFileName.value,
		geojson: parsedShpGeojson.value,
	});
	shpUploadDialogVisible.value = false;
	resetShpUploadState();
};

const beforeKmlUpload = (rawFile) => {
	const name = String(rawFile?.name || '');
	const isKml = /\.kml$/i.test(name);
	const isKmz = /\.kmz$/i.test(name);
	if (!isKml && !isKmz) {
		ElMessage.error('仅支持上传 .kml / .kmz 类型文件');
		return false;
	}
	parsedKmlFile.value = null;
	parsedKmlName.value = '';
	parsedKmlSourceFileName.value = name;
	kmlUploadPercentage.value = 0;
	kmlUploadProgressStatus.value = '';
	kmlUploadStatusText.value = '开始处理...';
	kmlUploadParsing.value = true;
	return true;
};

const handleLocalKmlParse = async (options) => {
	const file = options?.file;
	if (!file) {
		kmlUploadParsing.value = false;
		kmlUploadStatusText.value = '未检测到待处理文件';
		options?.onError?.(new Error('No file selected'));
		return;
	}
	try {
		options?.onProgress?.({ percent: 30 });
		kmlUploadStatusText.value = '正在读取本地文件...';
		await file.arrayBuffer();
		options?.onProgress?.({ percent: 100 });
		parsedKmlFile.value = file;
		parsedKmlSourceFileName.value = file.name || '';
		parsedKmlName.value = getDefaultParsedKmlName(file.name);
		kmlUploadStatusText.value = '文件已就绪，请确认名称后添加到地图';
		options?.onSuccess?.({ ok: true });
		ElMessage.success('KML/KMZ 文件已读取成功，请确认名称后添加到地图');
	} catch (error) {
		console.error('Failed to read local kml/kmz:', error);
		parsedKmlFile.value = null;
		kmlUploadStatusText.value = '读取失败，请检查文件是否有效';
		options?.onError?.(error);
		ElMessage.error('读取失败，请检查文件是否有效');
	} finally {
		kmlUploadParsing.value = false;
	}
};

const handleKmlUploadExceed = () => {
	ElMessage.warning('一次只能上传一个文件');
};

const handleKmlUploadProgress = (event, uploadFile, fileList) => {
	kmlFileList.value = fileList.slice(-1);
	kmlUploadPercentage.value = Math.min(100, Math.round(event?.percent || 0));
	kmlUploadProgressStatus.value = '';
	kmlUploadStatusText.value = kmlUploadParsing.value ? '正在处理...' : '处理中...';
};

const handleKmlUploadSuccess = (response, uploadFile, fileList) => {
	kmlFileList.value = fileList.slice(-1);
	kmlUploadPercentage.value = 100;
	kmlUploadProgressStatus.value = 'success';
	kmlUploadStatusText.value = '处理完成，请确认名称';
};

const handleKmlUploadError = (error, uploadFile, fileList) => {
	kmlFileList.value = fileList.slice(-1);
	kmlUploadProgressStatus.value = 'exception';
	kmlUploadStatusText.value = '处理失败';
	kmlUploadParsing.value = false;
};

const handleKmlUploadRemove = (uploadFile, fileList) => {
	kmlFileList.value = fileList.slice(-1);
	if (!kmlFileList.value.length) {
		resetKmlUploadState();
	}
};

const cancelParsedKml = () => {
	resetKmlUploadState();
};

const confirmParsedKml = () => {
	if (!parsedKmlFile.value) {
		ElMessage.warning('请先选择并读取 KML/KMZ 文件');
		return;
	}
	const name = String(parsedKmlName.value || '').trim() || getDefaultParsedKmlName(parsedKmlSourceFileName.value);
	emit('confirm-kml-import', {
		name,
		sourceFileName: parsedKmlSourceFileName.value,
		file: parsedKmlFile.value,
	});
	kmlUploadDialogVisible.value = false;
	resetKmlUploadState();
};

const beforeCadUpload = (rawFile) => {
	const name = String(rawFile?.name || '');
	const isDxf = /\.dxf$/i.test(name);
	if (!isDxf) {
		ElMessage.error('仅支持上传 .dxf 类型文件');
		return false;
	}
	if (Number(rawFile?.size || 0) > CAD_MAX_SIZE) {
		ElMessage.error('CAD 文件大小不能超过 20MB');
		return false;
	}
	parsedCadData.value = null;
	parsedCadName.value = '';
	parsedCadSourceFileName.value = name;
	cadUploadPercentage.value = 0;
	cadUploadProgressStatus.value = '';
	cadUploadStatusText.value = '开始处理...';
	cadUploadParsing.value = true;
	return true;
};

const handleLocalCadParse = async (options) => {
	const file = options?.file;
	if (!file) {
		cadUploadParsing.value = false;
		cadUploadStatusText.value = '未检测到待处理文件';
		options?.onError?.(new Error('No file selected'));
		return;
	}
	try {
		options?.onProgress?.({ percent: 20 });
		cadUploadStatusText.value = '正在读取本地文件...';
		const text = await file.text();
		options?.onProgress?.({ percent: 65 });
		cadUploadStatusText.value = '正在解析 DXF...';
		const parsed = dxfParser.parseSync(text);
		if (!parsed?.entities?.length) {
			throw new Error('未解析到有效 CAD 实体');
		}
		options?.onProgress?.({ percent: 100 });
		parsedCadData.value = parsed;
		parsedCadSourceFileName.value = file.name || '';
		parsedCadName.value = getDefaultParsedCadName(file.name);
		cadUploadStatusText.value = '解析完成，请确认名称后添加到地图';
		options?.onSuccess?.({ ok: true });
		ElMessage.success('CAD 文件解析成功，请确认名称后添加到地图');
	} catch (error) {
		console.error('Failed to parse local dxf:', error);
		parsedCadData.value = null;
		cadUploadStatusText.value = '解析失败，请检查 DXF 文件是否有效';
		options?.onError?.(error);
		ElMessage.error('解析失败，请检查 DXF 文件是否有效');
	} finally {
		cadUploadParsing.value = false;
	}
};

const handleCadUploadExceed = () => {
	ElMessage.warning('一次只能上传一个文件');
};

const handleCadUploadProgress = (event, uploadFile, fileList) => {
	cadFileList.value = fileList.slice(-1);
	cadUploadPercentage.value = Math.min(100, Math.round(event?.percent || 0));
	cadUploadProgressStatus.value = '';
	cadUploadStatusText.value = cadUploadParsing.value ? '正在解析...' : '处理中...';
};

const handleCadUploadSuccess = (response, uploadFile, fileList) => {
	cadFileList.value = fileList.slice(-1);
	cadUploadPercentage.value = 100;
	cadUploadProgressStatus.value = 'success';
	cadUploadStatusText.value = '处理完成，请确认名称';
};

const handleCadUploadError = (error, uploadFile, fileList) => {
	cadFileList.value = fileList.slice(-1);
	cadUploadProgressStatus.value = 'exception';
	cadUploadStatusText.value = '处理失败';
	cadUploadParsing.value = false;
};

const handleCadUploadRemove = (uploadFile, fileList) => {
	cadFileList.value = fileList.slice(-1);
	if (!cadFileList.value.length) {
		resetCadUploadState();
	}
};

const cancelParsedCad = () => {
	resetCadUploadState();
};

const confirmParsedCad = () => {
	if (!parsedCadData.value) {
		ElMessage.warning('请先选择并解析 DXF 文件');
		return;
	}
	if (!validateCadSpatialForm()) return;
	const name = String(parsedCadName.value || '').trim() || getDefaultParsedCadName(parsedCadSourceFileName.value);
	emit('confirm-cad-import', {
		name,
		sourceFileName: parsedCadSourceFileName.value,
		dxf: parsedCadData.value,
		spatialReference: buildCadSpatialReferencePayload(),
	});
	cadUploadDialogVisible.value = false;
	resetCadUploadState();
};

const toggleInfoList = () => {
	isInfoListCollapsed.value = !isInfoListCollapsed.value;
};

watch(
	() => props.syInfoItems.length,
	(newLength, oldLength) => {
		if (newLength === 0) {
			isInfoListCollapsed.value = true;
			return;
		}
		if (oldLength === 0 && newLength === 1) {
			isInfoListCollapsed.value = false;
		}
	},
	{ immediate: true }
);

watch(shpUploadDialogVisible, (visible) => {
	if (visible) return;
	resetShpUploadState();
});

watch(kmlUploadDialogVisible, (visible) => {
	if (visible) return;
	resetKmlUploadState();
});

watch(cadUploadDialogVisible, (visible) => {
	if (visible) return;
	resetCadUploadState();
});

watch(
	() => cadSpatialForm.projectionType,
	() => {
		const options = cadCoordinateSystemOptions.value;
		if (!options.length) return;
		if (!options.some((item) => item.value === cadSpatialForm.coordinateSystem)) {
			cadSpatialForm.coordinateSystem = options[0].value;
		}
		applyCadCoordinateSystemPreset();
	}
);
</script>

<style scoped lang="scss">
.toolbar {
	position: absolute;
	top: 50px;
	left: 0;
	right: 0;
	height: 60px;
	background: #f3f5f7;
	border-bottom: 1px solid #e0e3e6;
	display: flex;
	align-items: center;
	padding: 0 16px;
	gap: 16px;
	z-index: 2;
}

.tool-btn {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	background: transparent;
	border: none;
	cursor: pointer;
	padding: 4px 8px;
	border-radius: 4px;
	transition: background 0.2s;
	min-width: 50px;
}

.tool-btn:hover {
	background: #e9edef;
}

.tool-btn.active {
	background: #e1eefd;
	color: #007bff;
}

.tool-icon {
	width: 20px;
	height: 20px;
	margin-bottom: 2px;
}

.tool-btn span {
	font-size: 11px;
}

.terrain-panel {
	position: absolute;
	top: 130px;
	right: 20px;
	width: 360px;
	background: #fff;
	border: 1px solid #e0e3e6;
	border-radius: 10px;
	box-shadow: 0 8px 24px rgba(0, 0, 0, 0.16);
	overflow: hidden;
	z-index: 5;
}

:deep(.shp-upload-dialog .el-dialog) {
	border-radius: 12px;
	overflow: hidden;
}

:deep(.shp-upload-dialog .el-dialog__header) {
	margin-right: 0;
	padding: 16px 20px;
	border-bottom: 1px solid #e5e7eb;
}

:deep(.shp-upload-dialog .el-dialog__body) {
	padding: 20px;
}

.upload-demo {
	width: 100%;
}

.shp-name-panel {
	display: flex;
	flex-direction: column;
	gap: 8px;
	padding: 2px 0;
}

.cad-form-panel {
	gap: 14px;
}

.shp-name-label {
	font-size: 13px;
	font-weight: 600;
	color: #111827;
}

.shp-name-input {
	width: 100%;
	height: 38px;
	padding: 0 12px;
	border: 1px solid #d6dbe1;
	border-radius: 8px;
	box-sizing: border-box;
	outline: none;
	font-size: 13px;
	transition: border-color .2s, box-shadow .2s;
}

.shp-name-input:focus {
	border-color: #409eff;
	box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.12);
}

.shp-name-tip {
	font-size: 12px;
	line-height: 1.6;
	color: #6b7280;
}

.upload-status {
	margin-top: 16px;
	padding: 14px;
	border: 1px solid #e5e7eb;
	border-radius: 12px;
	background: #f8fafc;
}

.upload-status-head {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
	margin-bottom: 10px;
}

.upload-file-name {
	flex: 1;
	min-width: 0;
	font-size: 13px;
	color: #111827;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.upload-percent {
	flex-shrink: 0;
	font-size: 13px;
	font-weight: 600;
	color: #2563eb;
}

.upload-status-tip {
	margin-top: 8px;
	font-size: 12px;
	color: #6b7280;
}

.shp-dialog-footer {
	display: flex;
	justify-content: flex-end;
	gap: 10px;
	margin-top: 16px;
	padding-top: 16px;
	border-top: 1px solid #eef1f4;
}

.cad-spatial-card {
	display: flex;
	flex-direction: column;
	gap: 14px;
	margin-top: 6px;
}

.cad-spatial-section {
	padding: 14px;
	border: 1px solid #e5e7eb;
	border-radius: 10px;
	background: #f8fafc;
}

.cad-spatial-title {
	margin-bottom: 12px;
	font-size: 14px;
	font-weight: 700;
	color: #111827;
}

.cad-form-row {
	display: flex;
	align-items: center;
	gap: 12px;
	margin-bottom: 12px;
}

.cad-form-row:last-child {
	margin-bottom: 0;
}

.cad-form-row-top {
	align-items: flex-start;
}

.cad-form-row-wrap {
	align-items: flex-start;
	flex-wrap: wrap;
}

.cad-form-label {
	width: 88px;
	flex-shrink: 0;
	font-size: 13px;
	color: #374151;
	line-height: 32px;
}

.cad-form-field {
	flex: 1;
	min-width: 0;
}

.cad-select,
.cad-number-input {
	width: 100%;
	height: 36px;
	padding: 0 12px;
	border: 1px solid #d6dbe1;
	border-radius: 8px;
	box-sizing: border-box;
	outline: none;
	font-size: 13px;
	background: #fff;
	transition: border-color .2s, box-shadow .2s;
}

.cad-select:focus,
.cad-number-input:focus {
	border-color: #409eff;
	box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.12);
}

.cad-select:disabled,
.cad-number-input:disabled {
	background: #f3f4f6;
	color: #9ca3af;
	cursor: not-allowed;
}

.cad-radio-group,
.cad-checkbox-group {
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	gap: 18px;
	min-height: 36px;
}

.cad-radio-option,
.cad-checkbox-option {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	font-size: 13px;
	color: #374151;
	cursor: pointer;
}

.cad-radio-option.disabled {
	color: #9ca3af;
	cursor: not-allowed;
}

.cad-inline-grid {
	display: grid;
	grid-template-columns: minmax(0, 1fr) auto;
	gap: 8px;
	align-items: center;
}

.cad-inline-grid-wide {
	grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr) auto minmax(0, 1fr) auto;
}

.cad-unit-text {
	font-size: 13px;
	color: #6b7280;
	white-space: nowrap;
}

.cad-form-group-inline {
	display: flex;
	align-items: center;
	gap: 12px;
	flex: 1 1 180px;
	min-width: 180px;
}

.cad-form-group-inline .cad-form-label {
	width: 76px;
}

.cad-form-group-half {
	display: flex;
	align-items: center;
	gap: 12px;
	flex: 1 1 280px;
	min-width: 260px;
}

.cad-form-group-half .cad-form-label {
	width: 60px;
}

@media (max-width: 900px) {
	.cad-form-row {
		flex-direction: column;
		align-items: stretch;
	}

	.cad-form-label,
	.cad-form-group-inline .cad-form-label,
	.cad-form-group-half .cad-form-label {
		width: auto;
		line-height: 1.5;
	}

	.cad-form-group-inline,
	.cad-form-group-half {
		flex: 1 1 100%;
		min-width: 100%;
	}

	.cad-inline-grid-wide {
		grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr) auto;
	}
}

@media (max-width: 640px) {
	.cad-inline-grid-wide {
		grid-template-columns: minmax(0, 1fr) auto;
	}
}

:deep(.upload-demo .el-upload) {
	width: 100%;
}

:deep(.upload-demo .el-upload-dragger) {
	width: 100%;
	padding: 30px 20px;
	border-radius: 12px;
}

.terrain-panel-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 12px 14px;
	background: #f3f5f7;
	border-bottom: 1px solid #e0e3e6;
}

.terrain-panel-header span {
	font-size: 14px;
	font-weight: 600;
	color: #1f2937;
}

.terrain-panel-body {
	padding: 14px;
}

.terrain-name-input {
	width: 100%;
	height: 36px;
	padding: 0 12px;
	border: 1px solid #d6dbe1;
	border-radius: 8px;
	box-sizing: border-box;
	outline: none;
	font-size: 13px;
	margin-bottom: 10px;
}

.terrain-name-input:focus {
	border-color: #409eff;
	box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.12);
}

.terrain-textarea {
	width: 100%;
	height: 120px;
	padding: 10px 12px;
	border: 1px solid #d6dbe1;
	border-radius: 8px;
	resize: none;
	box-sizing: border-box;
	outline: none;
	font-size: 13px;
	line-height: 1.5;
}

.terrain-textarea:focus {
	border-color: #409eff;
	box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.12);
}

.terrain-tip {
	margin-top: 10px;
	font-size: 12px;
	line-height: 1.6;
	color: #6b7280;
}

.terrain-panel-footer {
	display: flex;
	justify-content: flex-end;
	gap: 10px;
	padding: 12px 14px 14px;
	border-top: 1px solid #eef1f4;
	background: #fafbfc;
}

.primary {
	background: #409eff;
	border: 1px solid #409eff;
	height: 30px;
	border-radius: 6px;
	padding: 0 14px;
	cursor: pointer;
	color: #fff;
	transition: .2s;
}

.primary:hover {
	background: #2f89e7;
	border-color: #2f89e7;
}

.measure-panel {
	position: absolute;
	top: 120px;
	right: 10px;
	width: 420px;
	height: calc(100vh - 205px);
	background: #F0F0F0;
	border-radius: 10px;
	box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
	overflow: hidden;
	z-index: 3;
}

.measure-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	background: #f3f5f7;
	padding: 10px 12px;
	border-bottom: 1px solid #e0e3e6;
}

.tabs {
	display: flex;
	gap: 8px;
}

.tab {
	background: #e9edef;
	color: #333;
	padding: 6px 10px;
	border-radius: 6px;
	font-size: 12px;
	cursor: pointer;
}

.tab.active {
	background: #ffffff;
	border: 1px solid #e0e3e6;
}

.close-btn {
	background: none;
	border: none;
	font-size: 24px;
	color: #000;
	cursor: pointer;
	padding: 0;
	width: 30px;
	height: 30px;
	display: flex;
	align-items: center;
	justify-content: center;
	border-radius: 50%;
	transition: all 0.2s ease;
	background-color: #e9e9e9;
}

.close-btn:hover {
	background-color: #6d6d6d;
	color: #fff;
}

.measure-body {
	background-color: #fff;
	overflow: auto;
	padding: 14px;
	height: calc(100% - 132px);
}

.input {
	width: 100%;
	height: 36px;
	border: 1px solid #e0e3e6;
	border-radius: 6px;
	padding: 0 10px;
	outline: none;
	box-sizing: border-box;
}

.result-box {
	margin-top: 12px;
	background: #edf3ff;
	border: 1px solid #cfe0ff;
	border-radius: 8px;
	padding: 14px;
}

.result-line {
	display: flex;
	align-items: center;
	gap: 10px;
}

.result-line + .result-line {
	margin-top: 10px;
}

.divider {
	width: 1px;
	height: 24px;
	background: #cfe0ff;
}

.badge {
	background: #4c87ff;
	color: #fff;
	font-size: 10px;
	padding: 2px 8px;
	border-radius: 12px;
}

.value {
	flex: 1;
	font-size: 18px;
	font-weight: 700;
	color: #1b2430;
	text-align: center;
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.unit {
	font-size: 14px;
	color: #6c757d;
	margin-right: 6px;
}

.row {
	display: flex;
	align-items: center;
	gap: 12px;
	margin-top: 12px;
}

.row label {
	width: 80px;
	color: #333;
	font-size: 13px;
}

.select {
	flex: 1;
	height: 34px;
	border: 1px solid #e0e3e6;
	border-radius: 6px;
	padding: 0 10px;
	background: #fff;
}

.textarea {
	width: 100%;
	height: 80px;
	border: 1px solid #e0e3e6;
	border-radius: 6px;
	padding: 8px 10px;
	outline: none;
	resize: vertical;
	margin-top: 12px;
	box-sizing: border-box;
}

.measure-footer {
	display: flex;
	justify-content: flex-end;
	gap: 12px;
	padding: 10px 14px;
	border-top: 1px solid #e0e3e6;
	background: #fafbfc;
}

.ghost {
	background: #ffffff;
	border: 1px solid #e0e3e6;
	height: 30px;
	border-radius: 6px;
	padding: 0 10px;
	cursor: pointer;
	color: #333;
	transition: .3s;
}

.ghost:hover {
	background: #ff7676;
	color: #f2f2f2;
}

.data-toolbar {
	display: flex;
	gap: 12px;
	justify-content: flex-start;
	margin-top: 10px;
}

.copy-btn {
	background: #ffffff;
	border: 1px solid #5ea2ff;
	color: #2f7cff;
	padding: 6px 12px;
	border-radius: 8px;
	cursor: pointer;
}

.copy-btn:hover {
	background: #f0f6ff;
}

.data-table {
	width: max-content;
	border-collapse: collapse;
	border: 1px solid #e0e3e6;
}

.data-table thead tr {
	background: #f8fafc;
}

.data-th,
.data-td {
	border: 1px solid #e0e3e6;
	padding: 8px;
	text-align: left;
}

.data-index {
	width: 40px;
	text-align: center;
	border: 1px solid #e0e3e6;
}

.data-cell {
	height: 36px;
	border: 1px solid #e0e3e6;
	border-radius: 6px;
	padding: 6px 10px;
	background: #fff;
	display: flex;
	align-items: center;
	white-space: nowrap;
}

.data-scroll {
	max-height: 300px;
	overflow: auto;
	border: 1px solid #e0e3e6;
	border-radius: 8px;
}
.info_list_shell {
	position: absolute;
	top: 120px;
	left: 10px;
	width: 380px;
	height: calc(100vh - 205px);
	z-index: 4;
	transition: transform 0.35s cubic-bezier(0.22, 1, 0.36, 1);
	will-change: transform;
}

.info_list_shell.collapsed {
	transform: translateX(calc(-120% + 56px));
}

.info_list{
	width: 100%;
	height: 100%;
	background: #ffffff;
	border-radius: 10px;
	box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
	padding: 10px;
	box-sizing: border-box;
	overflow: hidden;
}

.info_bookmark_btn {
	position: absolute;
	top: 0px;
	right: -50px;
	width: 60px;
	height: 40px;
	padding: 12px 8px;
	border: none;
	background: #ffffff;
	border-radius: 0 4px 4px 0;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 10px;
	cursor: pointer;
	z-index: 5;
	transition: right 0.35s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.25s ease, background 0.25s ease;
}

.info_bookmark_icon {
	width: 18px;
	height: 18px;
	transition: transform 0.5s cubic-bezier(0.22, 1, 0.36, 1);
}
.info_bookmark_btn.collapsed{
	width: 80px;
	right: -70px;
}
.info_bookmark_btn.collapsed .info_bookmark_icon {

	transform: translateX(120%) rotate(180deg);
}

.info_bookmark_count {
	width: 20px;
	height: 16px;
	line-height: 16px;
	font-size: 13px;
	border-radius: 3px;
	background: #e1eefd;
	color: #2563eb;
	position: absolute;
	top: 50%;
	left: 25px;
	transform: translateY(-50%);
}

.info_list_header {
	height: 48px;
	padding: 0 14px;
	display: flex;
	align-items: center;
	justify-content: space-between;
	background: #f3f5f7;
	border-bottom: 1px solid #e5e7eb;
	font-size: 14px;
	font-weight: 600;
	color: #111827;
	border-radius: 3px;
}

.info_list_count {
	min-width: 28px;
	height: 24px;
	padding: 0 8px;
	border-radius: 999px;
	background: #e1eefd;
	color: #2563eb;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	font-size: 12px;
}

.info_list_body {
	height: calc(100% - 90px);
	padding: 10px;
	overflow-y: auto;
	overflow-x: hidden;
	background: #fff;
	scrollbar-width: thin;
	scrollbar-color: #94a3b8 #f1f5f9;
}

.info_list_body::-webkit-scrollbar {
	width: 8px;
}

.info_list_body::-webkit-scrollbar-track {
	background: #f1f5f9;
	border-radius: 999px;
}

.info_list_body::-webkit-scrollbar-thumb {
	background: #94a3b8;
	border-radius: 999px;
}

.info_list_body::-webkit-scrollbar-thumb:hover {
	background: #64748b;
}

.info_list_empty {
	height: 100%;
	display: flex;
	align-items: center;
	justify-content: center;
	color: #9ca3af;
	font-size: 13px;
}

.info_item {
	display: flex;
	align-items: flex-start;
	gap: 10px;
	padding: 10px 12px;
	border: 1px solid #e5e7eb;
	border-radius: 10px;
	background: #fff;
	cursor: pointer;
	transition: all 0.2s ease;
}

.info_item + .info_item {
	margin-top: 10px;
}

.info_item:hover {
	border-color: #93c5fd;
	background: #f8fbff;
}

.info_item.active {
	border-color: #409eff;
	box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.12);
	background: #f4f9ff;
}

.info_item.hidden {
	opacity: 0.6;
}

.info_item_checkbox {
	margin-top: 3px;
	width: 16px;
	height: 16px;
	cursor: pointer;
}

.info_item_main {
	flex: 1;
	min-width: 0;
}

.info_item_top {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 10px;
}

.info_item_actions {
	display: flex;
	align-items: center;
	gap: 8px;
}

.info_item_name {
	flex: 1;
	min-width: 0;
	color: #111827;
	font-size: 14px;
	font-weight: 500;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.info_item_tag {
	width: 35px;
	text-align: center;
	flex-shrink: 0;
	border-radius: 999px;
	background: #eef2ff;
	color: #4f46e5;
	font-size: 11px;
}

.info_item_delete {
	flex-shrink: 0;
	width: 25px;
	height: 25px;
	border: none;
	border-radius: 8px;
	background: #ef4444be;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	cursor: pointer;
	transition: background 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
	box-shadow: 0 6px 14px rgba(239, 68, 68, 0.22);
}

.info_item_delete:hover {
	background: #dc2626;
	transform: translateY(-1px);
}

.info_item_delete_icon {
	width: 14px;
	height: 14px;
}

.info_item_subtitle {
	margin-top: 6px;
	color: #6b7280;
	font-size: 12px;
	line-height: 1.5;
	word-break: break-all;
	overflow: hidden;
	text-overflow: ellipsis;
	display: -webkit-box;
	-webkit-line-clamp: 2;
	-webkit-box-orient: vertical;
}

</style>
